import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  console.log("Creating test feedback...");
  const { data, error } = await supabase.from('feedbacks').insert({
    product_id: 'machu',
    text: 'Change background to pink! (Ralph Test)',
    author: 'Lisa',
    status: 'approved' // Directly approve to trigger agent
  }).select();

  if (error) {
    console.error("Error creating feedback:", error);
    return;
  }
  
  console.log("Feedback created:", data[0].id);
  console.log("Now run: node scripts/ralph-agent.js");
}

run();
