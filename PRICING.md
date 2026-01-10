# 🔌 PodNex API Pricing

Flexible infrastructure pricing for developers building voice/audio applications.

## 📊 Podcast Types & Costs

We offer two standardized formats optimized for consumption.

| Type | Duration | Word Count | Cost (Pay-as-you-go) | Best For |
|------|----------|------------|----------------------|----------|
| **Short** | 3-5 mins | ~600 words | **$0.30** / req | News briefs, quick summaries, flash briefings |
| **Long** | 8-10 mins | ~1350 words | **$0.60** / req | Deep dives, educational topics, storytelling |

---

## 📦 API Subscriptions

Choose between flexible monthly billing or committed yearly plans (**2 Months Free**).

### 🛠️ Hacker (Free)
*For integration testing and hobby projects.*
- **Price:** **$0 / month**
- **Monthly Allowance:** ~$0.90 value
  - **3** Short Podcasts
  - *OR* **1** Long Podcast
- **Rate Limit:** 1 concurrent job

### 💻 Indie
*For solo developers and side projects.*
- **Monthly:** **$25 / month**
- **Yearly:** **$250 / year** (Save $50)
- **Monthly Allowance:** ~$27.00 value
  - **90** Short Podcasts
  - *OR* **45** Long Podcasts
- **Unit Cost:** ~$0.27 (Short) / $0.55 (Long)
- **Rate Limit:** 3 concurrent jobs

### 🚀 Startup
*For growing apps and content workflows.*
- **Monthly:** **$49 / month**
- **Yearly:** **$490 / year** (Save ~$100)
- **Monthly Allowance:** ~$60.00 value
  - **200** Short Podcasts
  - *OR* **100** Long Podcasts
- **Unit Cost:** ~$0.24 (Short) / $0.49 (Long)
- **Rate Limit:** 10 concurrent jobs

### 🏢 Scale
*For high-volume content automation.*
- **Monthly:** **$199 / month**
- **Yearly:** **$1,990 / year** (Save ~$400)
- **Monthly Allowance:** ~$300.00 value
  - **1,000** Short Podcasts
  - *OR* **500** Long Podcasts
- **Unit Cost:** ~$0.19 (Short) / $0.39 (Long)
- **Features:**
  - 20 concurrent jobs
  - Priority Processing Queue
  - Dedicated Support Channel

---

## ⚙️ How Billing Works

### Generation Credits
We abstract the complexity of tokens and seconds into simple "Generation Credits".
- **Short Podcast** = 1 Credit
- **Long Podcast** = 2 Credits

### What's Included in a "Generation"?
One API call covers the entire pipeline:
1.  **AI Scripting:** LLM generation of a natural 2-person dialogue.
2.  **Text-to-Speech:** High-quality neural audio synthesis (Unreal Speech).
3.  **Audio Engineering:** Mixing, silence trimming, and formatting.
4.  **Hosting:** Temporary S3 storage (30 days) and CDN delivery.

### Overage
If you exceed your plan's included generations, you will be billed at the standard Pay-as-you-go rates ($0.30/Short, $0.60/Long) unless you upgrade.
