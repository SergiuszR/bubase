const axios = require('axios');

class EmailValidator {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.isChecking = false;
    }

    // Basic email format validation
    isValidFormat(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Check if email is cached and still valid
    getCachedResult(email) {
        const cached = this.cache.get(email);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.result;
        }
        return null;
    }

    // Cache the result
    setCachedResult(email, result) {
        this.cache.set(email, {
            result: result,
            timestamp: Date.now()
        });
    }

    // Clean old cache entries
    cleanCache() {
        const now = Date.now();
        for (const [email, data] of this.cache.entries()) {
            if ((now - data.timestamp) > this.cacheTimeout) {
                this.cache.delete(email);
            }
        }
    }

    // Check using free public API (no key required)
    async checkWithPublicAPI(email) {
        try {
            // Using a truly free email validation service
            const response = await axios.get(`https://api.eva.pingutil.com/email?email=${encodeURIComponent(email)}`, {
                timeout: 5000
            });
            
            const data = response.data;
            return {
                isValid: data.status === 'success' && data.data.deliverable,
                isSpam: data.data.disposable || data.data.role || false,
                provider: 'Eva Pingutil',
                confidence: data.data.deliverable ? 0.8 : 0.3
            };
        } catch (error) {
            console.warn('Eva Pingutil API check failed:', error.message);
            return null;
        }
    }

    // Check using another free API
    async checkWithValidationAPI(email) {
        try {
            // Another free service for basic validation
            const response = await axios.get(`https://emailvalidation.io/api/v1/${encodeURIComponent(email)}`, {
                timeout: 5000
            });
            
            return {
                isValid: response.data.is_valid_format && response.data.deliverable,
                isSpam: response.data.is_disposable_email || response.data.is_role_email || false,
                provider: 'EmailValidation.io',
                confidence: response.data.deliverable ? 0.7 : 0.4
            };
        } catch (error) {
            console.warn('EmailValidation.io check failed:', error.message);
            return null;
        }
    }

    // Advanced pattern-based spam detection
    checkSpamPatterns(email) {
        const [localPart, domain] = email.split('@');
        let spamScore = 0;
        
        // Check for suspicious patterns
        const spamPatterns = [
            /\d{8,}/, // Long sequences of numbers
            /^(test|temp|fake|spam|noreply|no-reply)/, // Common spam prefixes
            /\+.*\+/, // Multiple plus signs
            /(nospam|antispam)/i, // Anti-spam keywords (ironically spammy)
            /^[a-z]$/, // Single character emails
            /(.)\1{4,}/, // Repeated characters (5+ times)
        ];
        
        spamPatterns.forEach(pattern => {
            if (pattern.test(localPart)) spamScore += 0.2;
        });
        
        // Check domain patterns
        const suspiciousDomains = [
            /\d+\./, // Domains starting with numbers
            /-mail\./, // Suspicious mail domains
            /temp.*\./, // Temporary domains
            /\.tk$|\.ml$|\.ga$|\.cf$/i, // Free domain extensions often used for spam
        ];
        
        suspiciousDomains.forEach(pattern => {
            if (pattern.test(domain)) spamScore += 0.3;
        });
        
        return {
            isValid: spamScore < 0.5,
            isSpam: spamScore >= 0.3,
            provider: 'Pattern Analysis',
            confidence: 0.6 + (spamScore > 0.5 ? 0.3 : 0),
            spamScore: spamScore
        };
    }

    // Comprehensive check against known disposable email domains
    checkDisposableDomains(email) {
        const domain = email.split('@')[1]?.toLowerCase();
        const disposableDomains = [
            // Popular disposable email services
            '10minutemail.com', 'temp-mail.org', 'guerrillamail.com',
            'mailinator.com', 'tempmail.net', 'throwaway.email',
            'getnada.com', 'tempmail.plus', 'inboxkitten.com',
            'mohmal.com', 'tempmail.io', 'sharklasers.com',
            'yopmail.com', 'maildrop.cc', 'tempail.com',
            'dispostable.com', 'trashmail.com', 'fakemailgenerator.com',
            'emailondeck.com', 'mintemail.com', 'spamgourmet.com',
            'mailnesia.com', 'armyspy.com', 'cuvox.de', 'dayrep.com',
            'fleckens.hu', 'gustr.com', 'jourrapide.com', 'rhyta.com',
            'superrito.com', 'teleworm.us', 'einrot.com', 'gmx.com',
            // Additional patterns
            'mailnator.com', 'tempr.email', 'burnermail.io',
            'guerrillamailblock.com', 'spam4.me', 'mailnator.com',
            'tempmailaddress.com', 'emailfake.com', 'getairmail.com',
            'tempmailid.com', 'tempmail-generator.com'
        ];
        
        // Also check for patterns common in disposable domains
        const disposablePatterns = [
            /temp.*mail/i,
            /mail.*temp/i,
            /\d+mail/,
            /mail\d+/,
            /fake.*mail/i,
            /trash.*mail/i,
            /spam.*mail/i,
            /throw.*away/i,
            /disposable/i,
            /minute.*mail/i,
            /hour.*mail/i
        ];
        
        const isDisposable = disposableDomains.includes(domain) || 
                            disposablePatterns.some(pattern => pattern.test(domain));
        
        return {
            isValid: !isDisposable,
            isSpam: isDisposable,
            provider: 'Local Disposable Check',
            confidence: isDisposable ? 0.9 : 0.7
        };
    }

    // Main validation function
    async validateEmail(email) {
        if (!email || !this.isValidFormat(email)) {
            return {
                isValid: false,
                status: 'invalid_format',
                message: 'Invalid email format',
                confidence: 0
            };
        }

        // Check cache first
        const cached = this.getCachedResult(email);
        if (cached) {
            return cached;
        }

        // If already checking, return pending status
        if (this.isChecking) {
            return {
                isValid: true,
                status: 'checking',
                message: 'Checking email...',
                confidence: 0.5
            };
        }

        this.isChecking = true;
        
        try {
            // Run multiple checks in parallel for comprehensive validation
            const [
                publicApiResult,
                validationApiResult,
                disposableResult,
                patternResult
            ] = await Promise.allSettled([
                this.checkWithPublicAPI(email),
                this.checkWithValidationAPI(email),
                this.checkDisposableDomains(email),
                this.checkSpamPatterns(email)
            ]);

            // Collect successful results
            const results = [];
            
            if (publicApiResult.status === 'fulfilled' && publicApiResult.value) {
                results.push(publicApiResult.value);
            }
            if (validationApiResult.status === 'fulfilled' && validationApiResult.value) {
                results.push(validationApiResult.value);
            }
            if (disposableResult.status === 'fulfilled' && disposableResult.value) {
                results.push(disposableResult.value);
            }
            if (patternResult.status === 'fulfilled' && patternResult.value) {
                results.push(patternResult.value);
            }

            // If no API results, use local checks only
            if (results.length === 0) {
                const localResult = this.checkDisposableDomains(email);
                results.push(localResult);
            }

            // Aggregate results using weighted scoring
            let totalSpamScore = 0;
            let totalValidScore = 0;
            let totalWeight = 0;
            let providers = [];

            results.forEach(result => {
                const weight = result.confidence;
                totalWeight += weight;
                providers.push(result.provider);
                
                if (result.isSpam) {
                    totalSpamScore += weight;
                }
                if (result.isValid) {
                    totalValidScore += weight;
                }
            });

            // Calculate final scores
            const spamProbability = totalWeight > 0 ? totalSpamScore / totalWeight : 0;
            const validProbability = totalWeight > 0 ? totalValidScore / totalWeight : 0.5;

            // Determine final status based on aggregated results
            let status, message, isValid, isSpam;
            
            if (spamProbability > 0.6) {
                status = 'spam_risk';
                message = 'Email detected as disposable or risky';
                isValid = false;
                isSpam = true;
            } else if (spamProbability > 0.3) {
                status = 'risky';
                message = 'Email may have delivery issues';
                isValid = true; // Allow but warn
                isSpam = true;
            } else if (validProbability > 0.6) {
                status = 'valid';
                message = 'Email appears to be valid and clean';
                isValid = true;
                isSpam = false;
            } else {
                status = 'uncertain';
                message = 'Email validation uncertain - proceeding with caution';
                isValid = true; // Allow submission when uncertain
                isSpam = false;
            }

            const finalResult = {
                isValid: isValid,
                isSpam: isSpam,
                status: status,
                message: message,
                confidence: Math.min(totalWeight / results.length, 1.0),
                provider: providers.join(', '),
                spamProbability: spamProbability,
                validProbability: validProbability
            };

            // Cache the result
            this.setCachedResult(email, finalResult);
            
            return finalResult;

        } catch (error) {
            console.error('Email validation error:', error);
            return {
                isValid: true, // Allow submission on error
                status: 'error',
                message: 'Unable to verify email - proceeding with caution',
                confidence: 0.3
            };
        } finally {
            this.isChecking = false;
            this.cleanCache(); // Clean old cache entries
        }
    }

    // Debounced validation for real-time input
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Export singleton instance
module.exports = new EmailValidator(); 