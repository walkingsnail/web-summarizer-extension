document.getElementById("saveBtn").addEventListener("click", () => {
  const baseUrl = document.getElementById("baseUrl").value;
  const apiKey = document.getElementById("apiKey").value;
  const model1 = document.getElementById("model1").value;
  const model2 = document.getElementById("model2").value;
  const model3 = document.getElementById("model3").value;
  const temperature = parseFloat(document.getElementById("temperature").value) || 0.7;

  chrome.storage.sync.set({ 
    baseUrl, 
    apiKey, 
    model1, 
    model2, 
    model3, 
    temperature 
  }, () => {
    alert("保存成功！");
  });
});

window.onload = () => {
  chrome.storage.sync.get(["baseUrl", "apiKey", "model1", "model2", "model3", "temperature"], (items) => {
    document.getElementById("baseUrl").value = items.baseUrl || "";
    document.getElementById("apiKey").value = items.apiKey || "";
    document.getElementById("model1").value = items.model1 || "";
    document.getElementById("model2").value = items.model2 || "";
    document.getElementById("model3").value = items.model3 || "";
    document.getElementById("temperature").value = items.temperature || 0.7;
  });
};