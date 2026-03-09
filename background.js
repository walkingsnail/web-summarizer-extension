function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      ["baseUrl", "apiKey", "temperature"],
      (items) => resolve(items)
    );
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.action === "summarizeDirect") {
    handleSummary(request, sendResponse);
    return true;
  }

});

async function handleSummary(request, sendResponse) {

  try {

    const { baseUrl, apiKey, temperature } = await getConfig();

    if (!baseUrl || !apiKey) {
      sendResponse({ summary: "请先配置 Base URL 和 API Key" });
      return;
    }

    const content = request.content;
    const url = request.url;
    const customPrompt = request.customPrompt;
    const ONE_HOUR = 60 * 60 * 1000;

    if (!content) {
      sendResponse({ summary: "未获取到网页内容" });
      return;
    }

    // 生成缓存key: url + 自定义提示词的前10个字符（只保留字母数字和中文字符）
    let promptPrefix = "";
    if (customPrompt) {
      // 取前10个字符，过滤掉特殊字符
      promptPrefix = customPrompt.slice(0, 10).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '');
    }
    const cacheKey = `${url}_${promptPrefix}`;

    // 1️⃣ 尝试读取缓存
    chrome.storage.local.get([cacheKey], async (items) => {
      const cached = items[cacheKey];
      if (cached && Date.now() - cached.timestamp < ONE_HOUR) {
        // console.log("background.js: 使用缓存", cacheKey);
        sendResponse({ summary: cached.summary, fromCache: true });
        return;
      }

      // 2️⃣ 调用 LLM
      const cleanBaseUrl = baseUrl.replace(/\/v1$/, "");

      // 使用自定义prompt或默认prompt
      const prompt = customPrompt || `
你是一名专业信息分析助手。

第一步：
请判断该网页是否属于"财经 / 投资 / 金融市场"相关内容。
只需在内部判断，不要输出判断过程。

第二步：
如果是财经内容，请按以下 Markdown 结构输出：

# 📈 市场影响
...

# 🏢 个股影响
...

# 🏭 行业 / 概念
- 名称：简介

# 📊 关联个股
- 股票名称：逻辑

# 📌 一句话总结
...

如果是普通网页，请按以下 Markdown 结构输出：

# 🧠 核心观点
...

# 📌 关键要点
- ...

# 📊 重要事实
- ...

# 📝 一句话总结
...

要求：
- 必须输出 Markdown
- 使用清晰标题层级
- 不要输出多余说明

网页内容：
${content.slice(0, 12000)}
`;

      // 如果用户提供了自定义prompt，需要将网页内容附加到prompt中
      const finalPrompt = customPrompt ? 
        `${customPrompt}\n\n网页内容：\n${content.slice(0, 12000)}` : 
        prompt;

      const res = await fetch(`${cleanBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-ai/DeepSeek-V3.2",
          messages: [{ role: "user", content: finalPrompt }],
          temperature: temperature ?? 0.7
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        sendResponse({ summary: `接口错误 ${res.status}: ${errorText}` });
        return;
      }

      const data = await res.json();
      // console.log("background.js: API 返回", data);

      const summary = data?.choices?.[0]?.message?.content || "模型返回异常";

      // 写缓存（使用新的缓存key：url + 自定义提示词前10字符）
      // 不同prompt分析同一网页会有不同的缓存，不会相互覆盖
      chrome.storage.local.get(null, (items) => {
        const keys = Object.keys(items);
        if (keys.length >= 88) {
            chrome.storage.local.remove(keys[12], () => {
            });
          }
        });

      chrome.storage.local.set({
        [cacheKey]: { summary, timestamp: Date.now() }
      });

      sendResponse({ summary, fromCache: false });
    });

    return true; // 保证异步 sendResponse 可用

  } catch (e) {
    sendResponse({ summary: "调用失败：" + e.message });
  }
}