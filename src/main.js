// OpenTable Reviews Scraper - PlaywrightCrawler with Firefox
import { Actor, log } from 'apify';
import { PlaywrightCrawler, Dataset } from 'crawlee';
import { firefox } from 'playwright';

await Actor.init();

// Stealth User Agents - Firefox on various OS
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:147.0) Gecko/20100101 Firefox/147.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 15.7; rv:147.0) Gecko/20100101 Firefox/147.0',
    'Mozilla/5.0 (X11; Linux x86_64; rv:147.0) Gecko/20100101 Firefox/147.0',
];
const getRandomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

const input = (await Actor.getInput()) || {};
const {
    startUrls = [],
    results_wanted = 20,
    max_reviews_per_restaurant = 100,
    proxyConfiguration,
} = input;

// Global counter
let reviewsCount = 0;

const proxyConf = proxyConfiguration
    ? await Actor.createProxyConfiguration({ ...proxyConfiguration })
    : undefined;

// Helper to check if we reached the limit
const checkLimit = () => reviewsCount >= results_wanted;

// Prepare start URLs with correct labeling
const processedStartUrls = startUrls.map(urlObj => {
    const url = typeof urlObj === 'string' ? urlObj : urlObj.url;
    // Check if it's a restaurant URL: opentable.com/r/slug or opentable.com/restref/rid
    if (/\/r\/|\/restref\//i.test(url)) {
        return { url, userData: { label: 'DETAIL' } };
    }
    return { url, userData: { label: 'SEARCH' } };
});

const crawler = new PlaywrightCrawler({
    launchContext: {
        launcher: firefox,
        launchOptions: {
            headless: true,
        },
        userAgent: getRandomUserAgent(),
    },
    proxyConfiguration: proxyConf,
    maxConcurrency: 1, // Lower for more stability and less 403
    maxRequestRetries: 3,
    requestHandlerTimeoutSecs: 300,

    preNavigationHooks: [
        async ({ page }) => {
            await page.addInitScript(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
            });

            // Block heavy resources and trackers to speed up scraping and reduce detection
            await page.route('**/*', (route) => {
                const type = route.request().resourceType();
                const url = route.request().url();

                if (['image', 'font', 'media'].includes(type) ||
                    url.includes('google-analytics') ||
                    url.includes('googletagmanager') ||
                    url.includes('facebook') ||
                    url.includes('doubleclick') ||
                    url.includes('adsense') ||
                    url.includes('hotjar')) {
                    return route.abort();
                }
                return route.continue();
            });
        },
    ],

    requestHandler: async ({ page, request, enqueueLinks }) => {
        if (checkLimit()) return;

        log.info(`Processing: ${request.url}`);

        // Auto-assign label if missing
        if (!request.userData.label) {
            if (/\/r\/|\/restref\//i.test(request.url)) {
                request.userData.label = 'DETAIL';
            } else {
                request.userData.label = 'SEARCH';
            }
        }

        const label = request.userData.label;

        // Wait for page load
        try {
            await page.waitForLoadState('networkidle', { timeout: 30000 });
            await page.waitForFunction(() => window.__INITIAL_STATE__, { timeout: 15000 });
        } catch (e) {
            log.warning(`Page initialization timeout on ${request.url}. Content might be missing.`);
        }

        if (label === 'DETAIL') {
            await handleDetail(page, request);
        } else {
            await handleSearch(page, request, enqueueLinks);
        }
    },
});

async function handleSearch(page, request, enqueueLinks) {
    // Extract restaurant URLs and enqueue them
    // OpenTable metro/search pages usually list restaurants with links /r/slug

    // Auto-scroll to trigger lazy loading if needed (simple scroll)
    await page.evaluate(async () => {
        window.scrollTo(0, document.body.scrollHeight / 2);
        await new Promise(r => setTimeout(r, 1000));
        window.scrollTo(0, document.body.scrollHeight);
    });

    // Enqueue restaurant links
    const info = await enqueueLinks({
        selector: 'a[href*="/r/"]',
        globs: [
            'https://www.opentable.com/r/*',
            'https://www.opentable.co.uk/r/*',
            'https://www.opentable.ca/r/*',
            'https://www.opentable.com.au/r/*',
        ],
        userData: { label: 'DETAIL' },
        transformRequestFunction: (req) => {
            // Clean URL
            const url = new URL(req.url);
            url.search = '';
            url.hash = '';
            req.url = url.href;
            return req;
        }
    });

    log.info(`Enqueued ${info.processedRequests.length} restaurants from ${request.url}`);
}

async function handleDetail(page, request) {
    // Extract restaurant and security data
    const data = await page.evaluate(() => {
        const state = window.__INITIAL_STATE__;
        if (!state || !state.restaurantProfile) return null;

        // Find CSRF token if possible
        const csrfToken = window.__csrfToken || document.querySelector('meta[name="csrf-token"]')?.content || null;

        return {
            restaurantId: state.restaurantProfile.restaurant?.restaurantId,
            restaurantName: state.restaurantProfile.restaurant?.name,
            initialReviews: state.restaurantProfile.reviewsData?.reviewSearchResults?.reviews || [],
            totalCount: state.restaurantProfile.reviewsData?.reviewSearchResults?.totalCount || 0,
            csrfToken,
        };
    });

    if (!data || !data.restaurantId) {
        log.warning(`Could not find restaurant data on ${request.url}`);
        return;
    }

    log.info(`Restaurant: ${data.restaurantName} (ID: ${data.restaurantId}) - Total Reviews: ${data.totalCount}`);

    let extracted = 0;
    const { restaurantName, restaurantId } = data;
    const maxForThis = Math.min(max_reviews_per_restaurant, results_wanted - reviewsCount);

    // Process initial reviews
    const processReviews = async (reviews) => {
        const items = [];
        for (const r of reviews) {
            if (checkLimit()) break;
            if (extracted >= maxForThis) break;

            const item = {
                reviewId: r.reviewId,
                restaurantName,
                restaurantId,
                restaurantUrl: request.url,
                rating: r.rating?.overall,
                text: r.text,
                author: r.user?.nickname,
                date: r.dinedDateTime || r.submittedDateTime,
                visitDate: r.dinedDateTime,
                foodRating: r.rating?.food,
                serviceRating: r.rating?.service,
                ambienceRating: r.rating?.ambience,
                valueRating: r.rating?.value,
                noiseLevel: r.rating?.noise,
                helpfulCount: r.helpfulness?.score,
            };
            items.push(item);
            extracted++;
            reviewsCount++;
        }
        if (items.length) await Dataset.pushData(items);
        return items.length;
    };

    if (data.initialReviews.length) {
        await processReviews(data.initialReviews);
    }

    // Pagination via GraphQL
    let pageNum = 1;
    const pageSize = 10;

    while (!checkLimit() && extracted < maxForThis && extracted < data.totalCount) {
        pageNum++;
        log.info(`Fetching review page ${pageNum} for ${restaurantName}`);

        try {
            const responseData = await page.evaluate(async ({ rid, p, ps }) => {
                const body = {
                    operationName: "ReviewSearchResults",
                    variables: {
                        prioritiseUserLanguage: false,
                        gpid: 0,
                        restaurantId: rid,
                        page: p, // OpenTable pagination relies on page number
                        pageSize: ps,
                        sortBy: "newestReview",
                        searchTerm: "",
                        highlightFormat: "index"
                    },
                    extensions: {
                        persistedQuery: {
                            version: 1,
                            sha256Hash: "a544a8bb7070a1aa6c5e50b3f9bb239ba44f442eb9ac628f30b57bd3ae098b27"
                        }
                    }
                };

                // Use the exact URL format observed in network tab
                const res = await fetch('/dapi/fe/gql?optype=query&opname=ReviewSearchResults', {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                        'ot-page-group': 'rest-profile',
                        'ot-page-type': 'restprofilepage',
                        'x-csrf-token': data.csrfToken || '', // Use the extracted token
                    },
                    body: JSON.stringify(body)
                });

                if (!res.ok) return { error: res.status };
                return await res.json();
            }, { rid: restaurantId, p: pageNum, ps: pageSize });

            if (responseData.error) {
                log.warning(`Failed to fetch page ${pageNum}: Status ${responseData.error}`);
                break;
            }

            // The structure is data.restaurant.reviewSearchResults.reviews
            // Some responses might vary, but this was confirmed.
            const reviews = responseData.data?.restaurant?.reviewSearchResults?.reviews;

            if (!reviews || !reviews.length) {
                log.info('No more reviews found via API.');
                break;
            }

            await processReviews(reviews);
            // Random delay
            await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));

        } catch (err) {
            log.error(`Error fetching reviews page ${pageNum}: ${err.message}`);
            break;
        }
    }
}

await crawler.run(processedStartUrls);
await Actor.exit();
