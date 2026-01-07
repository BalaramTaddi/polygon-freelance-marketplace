import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from 'axios';
import { Profile } from './models/Profile.js';

// Load Gemini API Key from environment
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const SUBGRAPH_URL = process.env.SUBGRAPH_URL || 'https://api.thegraph.com/subgraphs/name/username/polylance';

/**
 * AI Job Matcher Service
 * Performs semantic matching between Job Descriptions and Freelancer Skills using Gemini.
 */
export async function calculateMatchScore(jobDescription, freelancerProfile) {
    try {
        if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");

        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const prompt = `
            Task: Match a job description to a freelancer's profile.
            Job Description: "${jobDescription}"
            Freelancer Skills: "${freelancerProfile.skills}"
            Freelancer Reputation Score: ${freelancerProfile.reputationScore}
            Freelancer Completed Jobs: ${freelancerProfile.completedJobs}

            Return a match score between 0.0 and 1.0 based on technical fit and experience.
            Output ONLY the numeric score.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();
        const score = parseFloat(text);

        return isNaN(score) ? 0.5 : Math.min(Math.max(score, 0), 1.0);
    } catch (error) {
        console.warn("AI Matching failed, falling back to keyword logic:", error.message);
        return fallbackMatch(jobDescription, freelancerProfile);
    }
}

/**
 * Keyword fallback for matching when AI is unavailable.
 */
function fallbackMatch(jobDescription, freelancerProfile) {
    const jobKeywords = (jobDescription || "").toLowerCase().split(/\W+/);
    const skills = (freelancerProfile.skills || "").toLowerCase().split(/\W+/);

    let matches = 0;
    skills.forEach(skill => {
        if (skill.length > 2 && jobKeywords.includes(skill)) {
            matches++;
        }
    });

    const finalScore = (matches / Math.max(jobKeywords.length * 0.2, 1));
    return Math.min(finalScore, 1.0);
}

/**
 * Queries the Subgraph for the best-matched freelancer dNFTs based on Gemini analysis.
 */
export async function queryBestMatchesFromSubgraph(jobDescription) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const analysisPrompt = `Extract main skill tags from this job: "${jobDescription}". Return only a comma-separated list.`;

        const result = await model.generateContent(analysisPrompt);
        const tags = (await result.response).text().split(',').map(s => s.trim());

        // Example Subgraph Query for Skill NFTs
        const query = `
        {
          freelancerNFTs(where: { category_in: ${JSON.stringify(tags)} }, orderBy: level, orderDirection: desc, first: 10) {
            id
            owner {
              id
            }
            category
            level
          }
        }`;

        // The following is a template for the user to configure their Subgraph
        // const response = await axios.post(SUBGRAPH_URL, { query });
        // return response.data.data.freelancerNFTs;

        console.log("Subgraph query prepared:", query);
        return []; // Placeholder until Subgraph is deployed
    } catch (error) {
        console.error("Subgraph Query Error:", error);
        return [];
    }
}
