// Email Validation Configuration
// This file contains settings for the email spam checking system

const emailValidationConfig = {
    // Free APIs - No setup required!
    // The system uses several free methods for email validation:
    // 1. Local disposable domain checking (always works)
    // 2. Pattern analysis for suspicious emails (always works)
    // 3. Free public APIs (may have rate limits)
    
    // API Settings
    apis: {
        // Free public APIs (no API key required)
        freeApis: {
            enabled: true,
            timeout: 5000, // 5 seconds
            maxRetries: 2
        },
        
        // Optional: Add API keys here if you want to use paid services
        // These will provide more accurate results but cost money
        paidApis: {
            // Hunter.io (50 free searches/month, then $39/month)
            hunter: {
                enabled: false,
                apiKey: '', // Add your API key here
                endpoint: 'https://api.hunter.io/v2/email-verifier'
            },
            
            // Abstract API (100 free requests/month, then $9/month)
            abstract: {
                enabled: false,
                apiKey: '', // Add your API key here  
                endpoint: 'https://emailvalidation.abstractapi.com/v1/'
            },
            
            // ZeroBounce (100 free credits, then $16/month)
            zeroBounce: {
                enabled: false,
                apiKey: '', // Add your API key here
                endpoint: 'https://api.zerobounce.net/v2/validate'
            }
        }
    },
    
    // Validation thresholds
    thresholds: {
        spamRisk: 0.6,      // Above this = high spam risk
        uncertain: 0.3,      // Between uncertain and spamRisk = medium risk
        validConfidence: 0.6 // Above this = considered valid
    },
    
    // Cache settings
    cache: {
        enabled: true,
        duration: 5 * 60 * 1000, // 5 minutes
        maxEntries: 100
    },
    
    // UI settings
    ui: {
        showValidationMessages: true,
        animationDuration: 300,
        hideSuccessAfter: 3000,
        debounceDelay: 1500
    },
    
    // Privacy settings
    privacy: {
        // The system makes API calls directly from the client
        // No emails are stored on your servers
        logValidationAttempts: false,
        respectDoNotTrack: true
    }
};

// Instructions for setup:
/*
QUICK START (No setup required):
1. The system works out of the box with free methods
2. It checks against 50+ known disposable email domains
3. Uses pattern analysis to detect suspicious emails
4. Optionally tries free public APIs

ENHANCED SETUP (Optional - for better accuracy):
1. Sign up for free accounts at Hunter.io, Abstract API, or ZeroBounce
2. Add your API keys to the config above
3. Set enabled: true for the APIs you want to use
4. Rebuild your bundle with: npm run bundle

The system will automatically:
- Use free methods first
- Fall back gracefully if APIs fail
- Cache results to avoid repeated calls
- Show user-friendly validation messages

For more information, see the README.md file.
*/

module.exports = emailValidationConfig; 