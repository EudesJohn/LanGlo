const supabase = require('../lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const { audio_base64, example_audio_base64, ...wordData } = req.body;
  
  // Helper to upload to storage (now NON-FATAL)
  const uploadAudio = async (base64, name) => {
    if (!base64) return null;
    
    try {
        const cleanBase64 = base64.replace(/^data:.*?;base64,/, '');
        const buffer = Buffer.from(cleanBase64, 'base64');
        const fileName = `${Date.now()}_${name}.ogg`;
        
        const { data, error } = await supabase.storage
        .from('audios')
        .upload(fileName, buffer, { contentType: 'audio/ogg' });
        
        if (error) {
           console.error(`Storage Upload Error (${name}):`, error.message);
           return null; // Don't crash, just return null
        }
        
        const { data: { publicUrl } } = supabase.storage
        .from('audios')
        .getPublicUrl(fileName);
        
        return publicUrl;
    } catch (uploadErr) {
        console.error("Critical Upload Error:", uploadErr.message);
        return null; // Still don't crash the whole dictionary insert
    }
  };

  try {
    const audio_url = await uploadAudio(audio_base64, 'word');
    const example_audio_url = await uploadAudio(example_audio_base64, 'example');

    const { 
        audio_base64: _a, 
        example_audio_base64: _e, 
        wordAudioBlob: _w, 
        phraseAudioBlob: _p, 
        ...cleanRecord 
    } = wordData;

    const { data, error } = await supabase
      .from('words')
      .insert([{
        ...cleanRecord,
        audio_url,
        example_audio_url,
        status: 'pending'
      }])
      .select();

    if (error) {
        console.error("DB Insert Error:", error.message);
        throw new Error(`Base de données : ${error.message}`);
    }
    
    return res.status(200).json({ success: true, data: data ? data[0] : null });
  } catch (e) {
    console.error("Global API Error:", e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
};