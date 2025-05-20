document.addEventListener('DOMContentLoaded', () => {
  const endpointInput = document.getElementById('endpointInput');
  const modelInput = document.getElementById('modelInput');
  const status = document.getElementById('status');
  // Load existing settings or use defaults
  chrome.storage.sync.get(
    { ollamaEndpoint: 'http://localhost:11434', modelName: 'gemma3:27b-it-qat' },
    (items) => {
      endpointInput.value = items.ollamaEndpoint;
      modelInput.value = items.modelName;
    }
  );
  document.getElementById('saveBtn').addEventListener('click', () => {
    const endpoint = endpointInput.value.trim();
    const modelName = modelInput.value.trim();
    chrome.storage.sync.set({ ollamaEndpoint: endpoint, modelName }, () => {
      status.textContent = '設定を保存しました。';
      setTimeout(() => { status.textContent = ''; }, 2000);
    });
  });
});