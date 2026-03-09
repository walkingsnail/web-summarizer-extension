document.getElementById("saveBtn").addEventListener("click", () => {
  const baseUrl = document.getElementById("baseUrl").value;
  const apiKey = document.getElementById("apiKey").value;
  const temperature = parseFloat(document.getElementById("temperature").value) || 0.7;

  chrome.storage.sync.set({ baseUrl, apiKey, temperature }, () => {
    alert("保存成功！");
  });
});

window.onload = () => {
  chrome.storage.sync.get(["baseUrl", "apiKey", "temperature"], (items) => {
    document.getElementById("baseUrl").value = items.baseUrl || "";
    document.getElementById("apiKey").value = items.apiKey || "";
    document.getElementById("temperature").value = items.temperature || 0.7;
  });
};