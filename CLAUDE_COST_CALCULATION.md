# Claude Image Cost Calculation

## Claude 3.5 Sonnet Pricing
- **Input tokens**: $3 per 1M tokens
- **Output tokens**: $15 per 1M tokens

## Image Token Calculation

### Your Image Compression Settings
- Max dimensions: 2048x2048 pixels
- Max file size: 500KB (compressed JPEG)
- Quality: 0.85

### Token Count per Image

For Claude's vision API, images are tokenized based on dimensions:
- **Formula**: (width × height) / 750 tokens (approximate)
- **Max size image (2048×2048)**: (2048 × 2048) / 750 ≈ **5,500 tokens**
- **Average compressed image (~1500×1500)**: (1500 × 1500) / 750 ≈ **3,000 tokens**

### Cost per Image Request

**Average scenario (1 image):**
- Image tokens: ~3,000 tokens
- System prompt: ~500 tokens
- User text: ~200 tokens
- **Total input**: ~3,700 tokens
- **Response output**: ~1,000 tokens (average)

**Cost breakdown:**
- Input cost: 3,700 / 1,000,000 × $3 = **$0.0111**
- Output cost: 1,000 / 1,000,000 × $15 = **$0.015**
- **Total per image**: **$0.0261**

## Answer: How Many Images for $5?

**$5 / $0.0261 per image ≈ 191 images**

### Realistic Estimate
- **Conservative**: ~150 images (accounting for larger images, longer responses)
- **Average**: ~190 images
- **Optimistic**: ~250 images (smaller images, shorter responses)

## Cost Breakdown Examples

| Images | Input Cost | Output Cost | Total Cost |
|--------|-----------|-------------|------------|
| 10     | $0.11     | $0.15       | $0.26      |
| 50     | $0.56     | $0.75       | $1.31      |
| 100    | $1.11     | $1.50       | $2.61      |
| 150    | $1.67     | $2.25       | $3.92      |
| 200    | $2.22     | $3.00       | $5.22      |

## Tips to Reduce Costs

1. **Image compression is already active** - reduces token usage by 60-80%
2. **Send smaller images** - lower resolution = fewer tokens
3. **Batch multiple images in one request** - more efficient than separate requests
4. **Shorter prompts** - less text = lower input cost
5. **Shorter responses** - less output = lower cost

## Notes

- These are estimates based on average usage
- Actual costs may vary based on:
  - Image complexity and size
  - Response length
  - System prompt size
  - Conversation context length
- Monitor your actual usage in Anthropic's dashboard

