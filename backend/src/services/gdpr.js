import crypto from 'crypto';

import { Consent, DataAccessRecord } from '../models/GDPR.js';
import { Profile } from '../models/Profile.js';

const ALGORITHM = 'aes-256-cbc';

let ENCRYPTION_KEY;
if (process.env.ENCRYPTION_KEY) {
    ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
} else {
    console.warn('⚠️  WARNING: ENCRYPTION_KEY env var is not set! Using a random key.');
    console.warn('⚠️  Any encrypted data will be LOST on server restart.');
    console.warn('⚠️  Generate a key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    ENCRYPTION_KEY = crypto.randomBytes(32);
}
const IV_LENGTH = 16;

/**
 * GDPR Data Management Service
 * Ported from gdpr_service.py for Node.js Express Backend
 */
export const GDPRService = {
    encrypt(text) {
        if (!text) return null;
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    },

    decrypt(text) {
        if (!text) return null;
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    },

    async recordConsent(address, dataCategory, legalBasis, purpose, consentGiven, ipAddress, userAgent) {
        return await Consent.create({
            address,
            dataCategory,
            legalBasis,
            purpose,
            consentGiven,
            consentDate: consentGiven ? new Date() : null,
            ipAddress,
            userAgent
        });
    },

    async logDataAccess(address, accessedBy, accessType, dataCategories, purpose, ipAddress) {
        return await DataAccessRecord.create({
            address,
            accessedBy,
            accessType,
            dataCategories,
            purpose,
            ipAddress
        });
    },

    /**
     * Right to Access (GDPR Article 15)
     */
    async getUserDataExport(address, requester, ipAddress) {
        const profile = await Profile.findOne({ address });
        if (!profile) return null;

        await this.logDataAccess(address, requester, 'data_export', ['all'], 'GDPR data access request', ipAddress);

        const consents = await Consent.find({ address }).sort({ createdAt: -1 });
        const accessLogs = await DataAccessRecord.find({ address }).sort({ createdAt: -1 }).limit(100);

        return {
            personal_data: {
                address: profile.address,
                name: profile.name,
                bio: profile.bio,
                skills: profile.skills,
                website: profile.website,
                github: profile.github,
                createdAt: profile.createdAt,
                updatedAt: profile.updatedAt
            },
            consents,
            access_logs: accessLogs,
            export_date: new Date().toISOString(),
            format: 'JSON'
        };
    },

    /**
     * Right to Erasure / Right to be Forgotten (GDPR Article 17)
     */
    async deleteUserData(address, requester, ipAddress) {
        await this.logDataAccess(address, requester, 'data_deletion', ['all'], 'GDPR right to erasure request', ipAddress);

        // Soft delete or anonymize
        await Profile.findOneAndUpdate(
            { address },
            {
                name: 'Anonymous Creator',
                bio: '[DELETED]',
                skills: '',
                website: '',
                github: '',
                avatarIpfsHash: ''
            }
        );

        // Withdraw all consents
        await Consent.updateMany(
            { address, consentGiven: true },
            { consentGiven: false, withdrawalDate: new Date() }
        );

        return { success: true, message: 'User data has been anonymized and consents withdrawn.' };
    }
};
