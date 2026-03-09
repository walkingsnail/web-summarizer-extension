// popup.js
document.addEventListener("DOMContentLoaded", () => {

  // UI元素
  const inputSection = document.getElementById("inputSection");
  const analysisSection = document.getElementById("analysisSection");
  const summaryDiv = document.getElementById("summary");
  const loadingDiv = document.getElementById("loading");
  const customPromptInput = document.getElementById("customPrompt");
  const countdownNumber = document.getElementById("countdownNumber");
  const confirmBtn = document.getElementById("confirmBtn");
  const skipBtn = document.getElementById("skipBtn");

  // 状态变量
  let countdown = 3;
  let countdownTimer = null;
  let inputFocused = false;  // 输入框是否被选中
  let pageText = "";
  let currentTab = null;

  // 初始化
  summaryDiv.innerHTML = "";
  loadingDiv.style.display = "block";

  // 启动倒计时
  function startCountdown() {
    countdownTimer = setInterval(() => {
      countdown--;
      countdownNumber.textContent = countdown;
      
      // 更新倒计时颜色
      if (countdown <= 1) {
        countdownNumber.style.color = "#ff0000";
      } else if (countdown <= 2) {
        countdownNumber.style.color = "#ff6b6b";
      }
      
      if (countdown <= 0) {
        clearInterval(countdownTimer);
        if (!inputFocused) {
          startAnalysis(); // 3秒内未选中输入框，自动使用默认prompt
        }
      }
    }, 1000);
  }

  // 开始分析
  async function startAnalysis(customPrompt = null) {
    // 隐藏输入界面，显示分析界面
    inputSection.style.display = "none";
    analysisSection.style.display = "block";
    
    try {
      // 发送消息给 background.js 请求分析
      chrome.runtime.sendMessage(
        { 
          action: "summarizeDirect", 
          content: pageText, 
          url: currentTab.url,
          customPrompt: customPrompt
        },
        (response) => {

          loadingDiv.style.display = "none";

          if (chrome.runtime.lastError) {
            summaryDiv.innerText = "通信错误：" + chrome.runtime.lastError.message;
            return;
          }

          if (!response) {
            summaryDiv.innerText = "未收到任何响应";
            return;
          }

          if (!response.summary) {
            summaryDiv.innerText = response?.summaryText || "未获取到分析结果";
            return;
          }

          // 尝试渲染 Markdown，如果失败显示原文
          try {
            // 1️⃣ 构建前缀信息
            let prefix = "";
            if (response.fromCache) {
              prefix = `<div style="text-align:center;font-weight:bold;color:#888888;margin-bottom:10px;">
              ⚡ 缓存结果
            </div>`;
            }

            // 2️⃣ 拼接前缀 + 原始 summary
            const html = marked.parse(response.summary);
            summaryDiv.innerHTML = prefix + html;
          } catch (e) {
            console.log("Markdown 渲染失败", e);
            summaryDiv.innerText = response.summary;
          }
        }
      );

    } catch (e) {
      console.error("popup.js: 捕获异常", e);
      loadingDiv.style.display = "none";
      summaryDiv.innerText = "发生错误：" + e.message;
    }
  }

  // 事件监听器 - 焦点检测
  customPromptInput.addEventListener("focus", () => {
    if (!inputFocused) {
      inputFocused = true;
      clearInterval(countdownTimer);
      
      // 显示确认按钮和跳过按钮
      confirmBtn.style.display = "block";
      skipBtn.style.display = "block";
      
      // 更新倒计时显示
      countdownNumber.textContent = "0";
      countdownNumber.style.color = "#666";
      document.querySelector("#countdown").innerHTML = "输入框已选中，点击按钮开始分析";
    }
  });

  // 失去焦点时也停止倒计时（防止用户点击其他地方）
  customPromptInput.addEventListener("blur", () => {
    if (inputFocused && countdown > 0) {
      clearInterval(countdownTimer);
      countdownNumber.textContent = "0";
      countdownNumber.style.color = "#666";
      document.querySelector("#countdown").innerHTML = "输入框已选中过，点击按钮开始分析";
    }
  });

  confirmBtn.addEventListener("click", () => {
    const customPrompt = customPromptInput.value.trim();
    // 点击确认按钮后判断：如果有输入则使用自定义prompt，否则使用默认prompt
    if (customPrompt) {
      startAnalysis(customPrompt);
    } else {
      startAnalysis(); // 没有输入，使用默认prompt
    }
  });

  skipBtn.addEventListener("click", () => {
    startAnalysis(); // 使用默认prompt
  });

  // 主初始化函数
  async function init() {
    try {
      // 获取当前活动标签页
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });

      currentTab = tab;

      // 注入脚本抓取页面内容
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          func: () => {
            const article = document.querySelector("article") || document.body;
            return article.innerText;
          }
        },
        (results) => {

          if (!results || !results[0]) {
            // 无法读取网页内容，直接显示错误
            inputSection.style.display = "none";
            analysisSection.style.display = "block";
            loadingDiv.style.display = "none";
            summaryDiv.innerText = "无法读取网页内容";
            return;
          }

          pageText = results[0].result;
          
          // 启动倒计时
          startCountdown();
        }
      );

    } catch (e) {
      console.error("popup.js: 初始化异常", e);
      // 显示错误信息
      inputSection.style.display = "none";
      analysisSection.style.display = "block";
      loadingDiv.style.display = "none";
      summaryDiv.innerText = "发生错误：" + e.message;
    }
  }

  // 启动初始化
  init();

});