document.addEventListener('DOMContentLoaded', () => {
  const endpointInput = document.getElementById('endpointInput');
  const modelSelect = document.getElementById('modelSelect');
  const status = document.getElementById('status');
  
  let currentEndpoint = '';
  let savedModelName = '';

  // Load existing settings or use defaults
  chrome.storage.sync.get(
    { ollamaEndpoint: 'http://localhost:11434', modelName: 'gemma3:27b-it-qat' },
    (items) => {
      endpointInput.value = items.ollamaEndpoint;
      savedModelName = items.modelName;
      currentEndpoint = items.ollamaEndpoint;
      fetchModels(items.ollamaEndpoint);
    }
  );

  // Fetch models when endpoint changes
  endpointInput.addEventListener('blur', () => {
    const newEndpoint = endpointInput.value.trim();
    if (newEndpoint !== currentEndpoint && newEndpoint) {
      currentEndpoint = newEndpoint;
      fetchModels(newEndpoint);
    }
  });

  // Fetch available models from Ollama API
  async function fetchModels(endpoint) {
    if (!endpoint) return;
    
    try {
      modelSelect.innerHTML = '<option value="">モデルを読み込み中...</option>';
      modelSelect.disabled = true;
      
      const response = await fetch(`${endpoint}/api/tags`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      modelSelect.innerHTML = '';
      
      if (data.models && data.models.length > 0) {
        data.models.forEach(model => {
          const option = document.createElement('option');
          option.value = model.name;
          option.textContent = model.name;
          if (model.name === savedModelName) {
            option.selected = true;
          }
          modelSelect.appendChild(option);
        });
      } else {
        modelSelect.innerHTML = '<option value="">モデルが見つかりません</option>';
      }
      
    } catch (error) {
      console.error('Failed to fetch models:', error);
      modelSelect.innerHTML = '<option value="">エラー: モデルを取得できませんでした</option>';
      status.textContent = `モデル取得エラー: ${error.message}`;
      status.className = 'error';
      setTimeout(() => { 
        status.textContent = ''; 
        status.className = '';
      }, 3000);
    } finally {
      modelSelect.disabled = false;
    }
  }

  document.getElementById('saveBtn').addEventListener('click', () => {
    const endpoint = endpointInput.value.trim();
    const modelName = modelSelect.value;
    
    if (!endpoint) {
      status.textContent = 'エンドポイントを入力してください。';
      status.className = 'error';
      setTimeout(() => { 
        status.textContent = ''; 
        status.className = '';
      }, 2000);
      return;
    }
    
    if (!modelName) {
      status.textContent = 'モデルを選択してください。';
      status.className = 'error';
      setTimeout(() => { 
        status.textContent = ''; 
        status.className = '';
      }, 2000);
      return;
    }
    
    chrome.storage.sync.set({ ollamaEndpoint: endpoint, modelName }, () => {
      status.textContent = '設定を保存しました。';
      status.className = '';
      savedModelName = modelName;
      setTimeout(() => { status.textContent = ''; }, 2000);
    });
  });
});