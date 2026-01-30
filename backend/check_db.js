import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Profile } from './src/models/Profile.js';
import { JobMetadata } from './src/models/JobMetadata.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/polylance';

async function checkDatabase() {
    try {
        console.log(`Connecting to: ${MONGODB_URI}`);
        await mongoose.connect(MONGODB_URI);
        console.log('Connected successfully!');

        const profileCount = await Profile.countDocuments();
        const jobCount = await JobMetadata.countDocuments();

        console.log('--- Database Stats ---');
        console.log(`Total Profiles: ${profileCount}`);
        console.log(`Total Job Metadata: ${jobCount}`);

        if (profileCount > 0) {
            const latestProfiles = await Profile.find().sort({ createdAt: -1 }).limit(3);
            console.log('\nLatest Profiles:');
            latestProfiles.forEach(p => {
                console.log(`- ${p.address}`);
                console.log(`  Name: ${p.name || 'N/A'}, Reputation: ${p.reputationScore}, Earned: ${p.totalEarned} MATIC`);
                if (p.avatarIpfsHash) console.log(`  Avatar (IPFS): ${p.avatarIpfsHash}`);
            });
        }

        if (jobCount > 0) {
            const latestJobs = await JobMetadata.find().sort({ createdAt: -1 }).limit(3);
            console.log('\nLatest Jobs:');
            latestJobs.forEach(j => {
                console.log(`- Job ID: ${j.jobId}, Title: ${j.title}`);
                if (j.ipfsHash) console.log(`  Details (IPFS): ${j.ipfsHash}`);
            });
        }

    } catch (error) {
        console.error('Database Check Failed:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

checkDatabase();
