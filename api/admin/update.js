const supabase = require('../lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const { audio_base64, example_audio_base64, ...wordData } = req.body;
  
  // Helper to upload to storage
  const uploadAudio = async (base64, name) => {
    if (!base64) return null;
    
    try {
        const cleanBase64 = base64.replace(/^data:.*?;base64,/, '');
        const buffer = Buffer.from(cleanBase64, 'base64');
        const fileName = `${Date.now()}_admin_rev_${name}.ogg`;
        
        const { data, error } = await supabase.storage
        .from('audios')
        .upload(fileName, buffer, { contentType: 'audio/ogg' });
        
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage
        .from('audios')
        .getPublicUrl(fileName);
        
        return publicUrl;
    } catch (e) {
        console.error("Admin Upload Error:", e.message);
        return null;
    }
  };

  try {
    const audio_url = await uploadAudio(audio_base64, 'word');
    const example_audio_url = await uploadAudio(example_audio_base64, 'example');

    // Update query object
    const updateData = { ...wordData };
    if (audio_url) updateData.audio_url = audio_url;
    if (example_audio_url) updateData.example_audio_url = example_audio_url;

    // Filter out frontend blobs
    delete updateData.wordAudioBlob;
    delete updateData.phraseAudioBlob;

    const { data, error } = await supabase
      .from('words')
      .update(updateData)
      .eq('id', wordData.id)
      .select();

    if (error) throw error;
    return res.status(200).json({ success: true, word: data[0] });
  } catch (e) {
    console.error("Admin Update Error:", e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
};
