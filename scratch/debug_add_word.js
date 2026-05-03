const supabase = require('../api/lib/supabase');

const testAudioUpload = async () => {
  console.log("--- STARTING AUDIO STORAGE DIAGNOSTIC ---");
  
  // Create a tiny dummy buffer (1x1 transparent pixel or just some noise)
  const dummyBuffer = Buffer.from('GbeTcheAudioContentTest', 'utf-8');
  const fileName = `test_upload_${Date.now()}.txt`;

  try {
    const { data, error } = await supabase.storage
      .from('audios')
      .upload(fileName, dummyBuffer, { contentType: 'text/plain' });

    if (error) {
      console.error("❌ STORAGE REJECTED UPLOAD:");
      console.error("Message:", error.message);
      console.error("Code:", error.code);
      console.error("Status:", error.status);
    } else {
      console.log("✅ SUCCESS! File uploaded to storage:", data.path);
      
      // Cleanup
      await supabase.storage.from('audios').remove([fileName]);
    }
  } catch (e) {
    console.error("💥 CRASH IN STORAGE SCRIPT:");
    console.error(e);
  }
};

testAudioUpload();
