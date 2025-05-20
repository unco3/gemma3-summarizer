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

  async function summarize() {
    loading.style.display = "block";
    errorEl.textContent = "";
    resultEl.innerHTML = "";
    rawMarkdownSummary = ""; // Reset raw markdown
    copyMarkdownBtn.disabled = true; // Disable button while loading
    copyMarkdownBtn.textContent = "コピー"; // Reset button text

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error("No active tab");

      const [injectionResult] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.body.innerText,
      });

      if (chrome.runtime.lastError) {
        // Handle potential errors from executeScript, e.g., if the page is restricted
        throw new Error(`Script injection failed: ${chrome.runtime.lastError.message}`);
      }
      if (!injectionResult || !injectionResult.result) {
          throw new Error("Could not extract text from the page. The page might be protected or empty.");
      }

      const pageText = injectionResult.result;
      console.log("[GemmaSummarizer] Extracted text length:", pageText.length);

      const maxLength = 5000; // Keep your existing max length
      let textToSummarize = pageText;
      if (pageText.length > maxLength) {
        textToSummarize = pageText.slice(0, maxLength) + "\n\n[... truncated]";
        console.log("[GemmaSummarizer] Text truncated to", maxLength, "chars");
      }

      // Load Ollama endpoint and model from settings (with defaults)
      const settings = await new Promise(resolve => {
        chrome.storage.sync.get(
        { ollamaEndpoint: "http://localhost:11434", modelName: "gemma3:27b-it-qat" },
          resolve
        );
      });
      const { ollamaEndpoint, modelName } = settings;
      const url = `${ollamaEndpoint}/api/generate`;
      const payload = {
        model: modelName,
        prompt: "以下の文章を日本語で要約してください:\n\n" + textToSummarize,
        stream: false
      };

      console.log("[GemmaSummarizer] URL:", url);
      console.log("[GemmaSummarizer] Payload prompt length:", payload.prompt.length);


      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(fetchErr => {
        console.error("[GemmaSummarizer] Fetch failed:", fetchErr);
        // Try to provide a more user-friendly message for common network issues
        if (fetchErr instanceof TypeError && fetchErr.message.includes('Failed to fetch')) {
            throw new Error("APIへの接続に失敗しました。サーバーが起動しているか確認してください。");
        }
        throw fetchErr;
      });

      console.log("[GemmaSummarizer] Response status:", response.status, response.statusText);
      if (!response.ok) {
        // Try to get more details from the API error response
        let apiErrorMsg = `API error: ${response.status}`;
        try {
            const errorData = await response.json();
            if (errorData && errorData.error) {
                apiErrorMsg += ` - ${errorData.error}`;
            }
        } catch (e) { /* Ignore if error response is not JSON */ }
        throw new Error(apiErrorMsg);
      }

      const data = await response.json();
      console.log("[GemmaSummarizer] Response JSON:", data);

      if (typeof data.response === "string") {
        rawMarkdownSummary = data.response.trim(); // Store raw Markdown
        resultEl.innerHTML = renderMarkdown(rawMarkdownSummary);
        copyMarkdownBtn.disabled = false; // Enable copy button
      } else {
        throw new Error("APIから有効な要約が返されませんでした。");
      }
    } catch (err) {
      console.error("[GemmaSummarizer] Error:", err);
      if (err.stack) console.error(err.stack);
      errorEl.textContent = err.message || String(err);
      resultEl.innerHTML = ""; // Clear any previous results
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
      // copyMarkdownBtn.textContent = "コピー";
    }
  });

  summarize(); // Initial call to summarize
});