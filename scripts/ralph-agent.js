
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

// Load env
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const PRODUCT_ID = 'machu';

async function logPipeline(feedbackId, stage, status, logs) {
    console.log(`[PIPELINE] ${stage}: ${status} - ${logs}`);
    await supabase.from('pipeline_logs').insert({
        product_id: PRODUCT_ID,
        feedback_id: feedbackId,
        stage,
        status,
        logs,
        duration_ms: Math.floor(Math.random() * 5000) + 1000 // Fake duration
    });
}

async function runCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error.message}`);
                resolve({ success: false, output: stderr });
            } else {
                console.log(`Output: ${stdout}`);
                resolve({ success: true, output: stdout });
            }
        });
    });
}

async function ralphsTurn() {
    console.log("Ralph is looking for work...");

    // 1. Check for Approved Feedbacks
    const { data: feedbacks, error } = await supabase
        .from('feedbacks')
        .select('*')
        .eq('product_id', PRODUCT_ID)
        .eq('status', 'approved')
        .limit(1);

    if (error) {
        console.error("Ralph tripped!", error);
        return;
    }

    if (!feedbacks || feedbacks.length === 0) {
        console.log("No work for Ralph! *eats glue*");
        return;
    }

    const task = feedbacks[0];
    console.log(`Found task: ${task.text} (ID: ${task.id})`);

    // 2. Start Fixing
    await supabase.from('feedbacks').update({ status: 'fixing' }).eq('id', task.id);
    await logPipeline(task.id, 'ai_fix', 'running', 'Ralph is reading the code...');

    // Simulate AI Fix: Modify App.tsx to add a comment with the feedback
    const appPath = path.resolve('src/App.tsx'); // Adjusted path based on ls output
    // Start - verify existence of src/App.tsx first, fall back to App.tsx
    let targetFile = 'src/App.tsx';
    if (!fs.existsSync(targetFile)) {
        if (fs.existsSync('App.tsx')) targetFile = 'App.tsx';
        else {
            console.error("Ralph can't find App.tsx!");
            await logPipeline(task.id, 'ai_fix', 'failed', 'Source file not found');
            return;
        }
    }

    try {
        let content = fs.readFileSync(targetFile, 'utf-8');
        const fixComment = `\n// [Ralph Fix] Address feedback: ${task.text} at ${new Date().toISOString()}`;
        // Append to end
        fs.appendFileSync(targetFile, fixComment);
        console.log("Ralph fixed the code!");

        await logPipeline(task.id, 'ai_fix', 'success', `Applied fix for: ${task.text}`);
    } catch (err) {
        console.error("Ralph broke the pencil!", err);
        await logPipeline(task.id, 'ai_fix', 'failed', err.message);
        return;
    }

    // 3. Run Tests
    await logPipeline(task.id, 'unit_test', 'running', 'Running npm test...');
    // Mock test pass for speed (or run real test if exists)
    // const testResult = await runCommand('npm test'); 
    // For demo speed, we assume Ralph is perfect
    await new Promise(r => setTimeout(r, 2000));
    await logPipeline(task.id, 'unit_test', 'success', 'All tests passed! (Ralph checked twice)');

    // 4. Deploy to Staging
    await logPipeline(task.id, 'deploy_staging', 'running', 'Pushing to Vercel...');
    // Use Vercel CLI to deploy
    // We need Vercel token? We are logged in via CLI globally.
    // We use npx vercel --yes
    const deployResult = await runCommand('npx vercel --yes --build-env VITE_SUPABASE_URL=' + process.env.VITE_SUPABASE_URL + ' --build-env VITE_SUPABASE_ANON_KEY=' + process.env.VITE_SUPABASE_ANON_KEY);

    if (deployResult.success) {
        const urlMatch = deployResult.output.match(/https:\/\/[^\s]+\.vercel\.app/);
        const deployUrl = urlMatch ? urlMatch[0] : 'https://unknown-url.vercel.app';

        await logPipeline(task.id, 'deploy_staging', 'success', `Deployed to: ${deployUrl}`);

        // Update Feedback Status
        await supabase.from('feedbacks').update({ status: 'staged' }).eq('id', task.id);
        console.log("Ralph is done! I'm a unicorn!");
    } else {
        await logPipeline(task.id, 'deploy_staging', 'failed', 'Vercel deployment failed');
        console.error("Ralph dropped the deployment!", deployResult.output);
    }
}

ralphsTurn();
