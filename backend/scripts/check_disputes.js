
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Profile } from '../src/models/Profile.js';
import { JobMetadata } from '../src/models/JobMetadata.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/polylance';

async function checkDisputes() {
    try {
        console.log(`Connecting to: ${MONGODB_URI}`);
        await mongoose.connect(MONGODB_URI);
        console.log('Connected successfully!');

        const disputes = await JobMetadata.find({ status: 3 });
        console.log(`\nFound ${disputes.length} Disputes (Status 3)`);

        disputes.forEach(d => {
            console.log(`- Job ID: ${d.jobId}, Title: ${d.title}`);
            console.log(`  Freelancer: ${d.freelancer}`);
            console.log(`  Client: ${d.client}`);
            console.log(`  Evidence Count: ${d.evidence?.length || 0}`);
        });

    } catch (error) {
        console.error('Check failed:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

checkDisputes();
