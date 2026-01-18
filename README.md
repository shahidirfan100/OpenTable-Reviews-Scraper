# OpenTable Reviews Scraper

Extract comprehensive restaurant reviews and ratings from OpenTable with ease. Collect detailed feedback, dining scores, and reviewer insights to monitor reputation and analyze market trends.

## Features

- **Review Collection** — Capture full review text and reviewer nicknames across any restaurant.
- **Detailed Ratings** — Extract specific scores for food, service, ambience, and value.
- **Sentiment Analysis Ready** — Get clean text data perfect for NLP and satisfaction monitoring.
- **Automated Pagination** — Effortlessly scrape hundreds of reviews per restaurant with built-in navigation.
- **Batch Processing** — Provide multiple restaurant or search URLs to gather reviews at scale.

## Use Cases

### Reputation Management
Monitor customer feedback for your own restaurants or competitors in real-time. Identify recurring complaints or praise to improve service quality and customer satisfaction.

### Market Intelligence
Analyze dining trends and popular cuisines in specific metros. Understand what makes highly-rated restaurants successful through the lens of their customers.

### Sentiment Analysis
Build large-scale datasets of restaurant reviews for machine learning models. Analyze how external factors like location or price range correlate with customer sentiment.

### Competitive Benchmarking
Compare your restaurant's service and food ratings against local competitors to identify your strengths and areas for improvement.

---

## Input Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `startUrls` | Array | Yes | — | List of OpenTable URLs (Search results or specific Restaurant pages) to scrape reviews from. |
| `results_wanted` | Integer | No | `20` | The total maximum number of reviews to collect per run. |
| `max_reviews_per_restaurant` | Integer | No | `100` | Limit the number of reviews scraped per restaurant to ensure variety. |
| `proxyConfiguration` | Object | Yes | `RESIDENTIAL` | Proxy settings. Residential proxies are highly recommended for reliable extraction. |

---

## Output Data

Each item in the dataset represents a single review:

| Field | Type | Description |
|-------|------|-------------|
| `reviewId` | String | Unique identifier for the review. |
| `restaurantName` | String | The name of the restaurant. |
| `restaurantId` | String | Internal OpenTable ID for the restaurant. |
| `restaurantUrl` | String | URL of the restaurant profile. |
| `rating` | Number | Overall star rating (1-5). |
| `text` | String | The full text content of the review. |
| `author` | String | Nickname or display name of the reviewer. |
| `date` | String | Date and time the review was submitted. |
| `visitDate` | String | Date the reviewer actually dined at the restaurant. |
| `foodRating` | Number | Specific score for food quality (1-5). |
| `serviceRating` | Number | Specific score for service quality (1-5). |
| `ambienceRating` | Number | Specific score for atmosphere/ambience (1-5). |
| `valueRating` | Number | Specific score for price/value (1-5). |
| `noiseLevel` | String | Qualitative noise description (e.g., LOUD, MODERATE). |
| `helpfulCount` | Number | Number of other users who found this review helpful. |

---

## Usage Examples

### Basic Review Extraction
Scrape the latest reviews from a single popular restaurant.

```json
{
    "startUrls": [
        { "url": "https://www.opentable.com/r/bestia-los-angeles" }
    ],
    "results_wanted": 50
}
```

### Batch Scraping from Search
Provide a search or metro URL to collect reviews from all restaurants in that area.

```json
{
    "startUrls": [
        { "url": "https://www.opentable.com/metro/los-angeles-restaurants" }
    ],
    "results_wanted": 100,
    "max_reviews_per_restaurant": 20
}
```

### Competitive Monitoring
Compare multiple specific restaurants by providing their URLs.

```json
{
    "startUrls": [
        { "url": "https://www.opentable.com/r/restaurant-a" },
        { "url": "https://www.opentable.com/r/restaurant-b" }
    ],
    "results_wanted": 200,
    "proxyConfiguration": {
        "useApifyProxy": true,
        "apifyProxyGroups": ["RESIDENTIAL"]
    }
}
```

---

## Sample Output

```json
{
    "reviewId": "OT-96412-2110686937",
    "restaurantName": "Bestia",
    "restaurantId": "96412",
    "restaurantUrl": "https://www.opentable.com/r/bestia-los-angeles",
    "rating": 5,
    "text": "The food was incredible, especially the bone marrow and the cavatelli. Service was attentive and the atmosphere was lively.",
    "author": "FoodieLA",
    "date": "2023-11-20T10:45:00Z",
    "visitDate": "2023-11-18T19:30:00Z",
    "foodRating": 5,
    "serviceRating": 5,
    "ambienceRating": 4,
    "valueRating": 5,
    "noiseLevel": "LOUD",
    "helpfulCount": 12
}
```

---

## Tips for Best Results

### Use Residential Proxies
OpenTable employs sophisticated traffic analysis. To avoid interruptions and ensure high success rates, always use **Apify Residential Proxies**.

### Optimize Sample Size
When scraping a large metro area, set a reasonable `max_reviews_per_restaurant` (e.g., 10-20) to get a diverse spread of feedback across many establishments rather than focusing on a few.

### Identify the Right URLs
- **Restaurant URLs**: Use specific profile pages for deep dives into a single brand.
- **Search URLs**: Use filtered search results (by cuisine, price, or location) to gather targeted category data.

---

## Integrations

Connect your OpenTable review data with your existing tech stack:

- **Google Sheets** — Export reviews for sentiment tagging and reporting.
- **Slack** — Get alerts when new highly-rated or poorly-rated reviews are detected.
- **Airtable** — Build a searchable database of restaurant feedback.
- **Tableau/Power BI** — Visualize ratings and reviewer trends over time.

### Export Formats
Download your data in various industry-standard formats:
- **JSON** — Ready for API consumption and developer workflows.
- **CSV** — Ideal for Excel and spreadsheet analysis.
- **XML** — For legacy system integrations.
- **Excel** — For clean business reporting.

---

## Frequently Asked Questions

### Can I scrape reviews from any country?
Yes, the scraper supports OpenTable domains globally, including the US, UK, Canada, Australia, and Germany.

### Does it handle different languages?
The scraper collects the text as it appears on the site. If a review is written in Spanish or French, it will be extracted in that language.

### How many reviews can I scrape?
There is no hard limit. You can collect thousands of reviews, but we recommend using residential proxies for large-scale runs to maintain reliability.

---

## Support

For technical issues, feature requests, or custom scraping needs, please contact support through the Apify Console.

### Resources
- [Apify Documentation](https://docs.apify.com/)
- [Schedules and API](https://docs.apify.com/schedules)
- [Proxy Management](https://docs.apify.com/proxy)

---

## Legal Notice

This scraper is intended for legal data collection and market research. Users are responsible for complying with OpenTable's terms of service and all applicable local regulations regarding data privacy. Use data responsibly and respect the platform's rate limits.