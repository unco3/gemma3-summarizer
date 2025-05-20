document.addEventListener("DOMContentLoaded", () => {
  const loading = document.getElementById("loading");
  const resultEl = document.getElementById("result");
  const errorEl = document.getElementById("error");
  const copyMarkdownBtn = document.getElementById("copyMarkdownBtn");
  const settingsBtn = document.getElementById("settingsBtn");
  settingsBtn.addEventListener("click", () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL("options.html"));
    }
  });

  let rawMarkdownSummary = ""; // Variable to store the raw Markdown

  // Minimal Markdown renderer (from your original code)
  const renderMarkdown = (md) => {
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    html = html
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/^######\s*(.*)$/gm, '<h6>$1</h6>')
      .replace(/^#####\s*(.*)$/gm, '<h5>$1</h5>')
      .replace(/^####\s*(.*)$/gm, '<h4>$1</h4>')
      .replace(/^###\s*(.*)$/gm, '<h3>$1</h3>')
      .replace(/^##\s*(.*)$/gm, '<h2>$1</h2>')
      .replace(/^#\s*(.*)$/gm, '<h1>$1</h1>')
      .replace(/^>\s*(.*)$/gm, '<blockquote>$1</blockquote>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/^\s*[-*]\s+(.*)$/gm, '<li>$1</li>');
    html = html.replace(/(?:<li>[\s\S]*?<\/li>\s*)+/g, (m) => '<ul>' + m.trim() + '</ul>');
    html = html.replace(/^(?!<h\d|<ul|<li|<pre|<blockquote|<strong|<code)(.+)$/gm, '<p>$1</p>');
    return html;
  };

  // Helper function to get text from the active tab
  async function getActiveTabText() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) { // Added a check for tab itself
      throw new Error("アクティブなタブが見つかりませんでした。");
    }

    try {
      const [injectionResult] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.body.innerText,
      });

      if (chrome.runtime.lastError) {
        throw new Error(`スクリプトの挿入に失敗しました: ${chrome.runtime.lastError.message}`);
      }
      if (!injectionResult || !injectionResult.result) {
        throw new Error("ページからテキストを抽出できませんでした。ページが保護されているか、空である可能性があります。");
      }
      return injectionResult.result;
    } catch (e) {
        // More specific error for executeScript failure
        console.error("[GemmaSummarizer] Error in executeScript:", e);
        throw new Error(`ページコンテンツの取得に失敗しました: ${e.message}`);
    }
  }

  // Helper function to call the Ollama API
  async function callOllamaAPI(text, promptTemplate, model, endpoint) {
    const maxLength = 5000; // Max length for the text to summarize
    let textToSummarize = text;
    if (text.length > maxLength) {
      textToSummarize = text.slice(0, maxLength) + "\n\n[... truncated]";
      // console.log("[GemmaSummarizer] Text truncated to", maxLength, "chars"); // Keep for debugging if necessary
    }

    const payload = {
      model: model,
      prompt: promptTemplate + textToSummarize,
      stream: false,
    };

    // console.log("[GemmaSummarizer] API URL:", endpoint); // Keep for debugging
    // console.log("[GemmaSummarizer] API Payload prompt length:", payload.prompt.length); // Keep for debugging

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        return response;
    } catch (fetchErr) {
        console.error("[GemmaSummarizer] Fetch failed:", fetchErr);
        if (fetchErr instanceof TypeError && fetchErr.message.includes('Failed to fetch')) {
            throw new Error("APIへの接続に失敗しました。Ollamaサーバーが起動しているか、URL設定を確認してください。");
        }
        throw new Error(`ネットワークエラー: ${fetchErr.message}`); // More generic network error
    }
  }

  // Helper function to handle the API response
  async function handleAPIResponse(response) {
    // console.log("[GemmaSummarizer] Response status:", response.status, response.statusText); // Keep for debugging
    if (!response.ok) {
      let apiErrorMsg = `APIエラー: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData && errorData.error) {
          apiErrorMsg += ` - ${errorData.error}`;
        }
      } catch (e) {
        // console.warn("[GemmaSummarizer] Could not parse error response JSON:", e); // Keep for debugging
      }
      throw new Error(apiErrorMsg);
    }

    const data = await response.json();
    // console.log("[GemmaSummarizer] Response JSON:", data); // Keep for debugging

    if (typeof data.response === "string") {
      return data.response.trim();
    } else {
      throw new Error("APIから有効な形式の要約が返されませんでした。");
    }
  }

  // Main summarize function, now refactored
  async function summarize() {
    loading.style.display = "block";
    errorEl.textContent = "";
    resultEl.innerHTML = "";
    rawMarkdownSummary = "";
    copyMarkdownBtn.disabled = true;
    copyMarkdownBtn.textContent = "コピー";

    try {
      const pageText = await getActiveTabText();
      // console.log("[GemmaSummarizer] Extracted text length:", pageText.length); // Keep for debugging

      const settings = await new Promise(resolve => {
        chrome.storage.sync.get(
          { ollamaEndpoint: "http://localhost:11434", modelName: "gemma3:27b-it-qat" },
          resolve
        );
      });
      const { ollamaEndpoint, modelName } = settings;
      const apiEndpoint = `${ollamaEndpoint}/api/generate`;
      const promptTemplate = "以下の文章を日本語で要約してください:\n\n";

      const response = await callOllamaAPI(pageText, promptTemplate, modelName, apiEndpoint);
      rawMarkdownSummary = await handleAPIResponse(response);

      resultEl.innerHTML = renderMarkdown(rawMarkdownSummary);
      copyMarkdownBtn.disabled = false;
    } catch (err) {
      console.error("[GemmaSummarizer] Summarization error:", err); // Centralized error logging
      // if (err.stack) console.error(err.stack); // Potentially too verbose for users, good for dev
      errorEl.textContent = err.message || "不明なエラーが発生しました。";
      resultEl.innerHTML = "";
      rawMarkdownSummary = "";
      copyMarkdownBtn.disabled = true;
    } finally {
      loading.style.display = "none";
    }
  }

  copyMarkdownBtn.addEventListener("click", async () => {
    if (!rawMarkdownSummary || copyMarkdownBtn.disabled) return;

    try {
      await navigator.clipboard.writeText(rawMarkdownSummary);
      copyMarkdownBtn.textContent = "コピー完了!";
      copyMarkdownBtn.style.backgroundColor = "var(--success-color)"; // Green feedback
      setTimeout(() => {
        copyMarkdownBtn.textContent = "コピー";
        copyMarkdownBtn.style.backgroundColor = "var(--accent-color)"; // Reset color
      }, 2000);
    } catch (err) {
      console.error("[GemmaSummarizer] Failed to copy text: ", err);
      errorEl.textContent = "テキストのコピーに失敗しました。";
      // Optionally, revert button text if copy failed immediately
      // copyMarkdownBtn.textContent = "コピー"; // Already handled by disabling
    }
  });

  summarize(); // Initial call to summarize
});