const supabase = require('../lib/supabase');
const { verifyAdmin } = require('../lib/auth');

module.exports = async (req, res) => {
  const action = req.params?.action || req.query?.action || req.url.split('/').pop().split('?')[0];

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("ADMIN ERROR: SUPABASE_SERVICE_ROLE_KEY is missing from environment variables!");
    return res.status(500).json({
      success: false,
      message: "Erreur de configuration : la clé secrète SUPABASE_SERVICE_ROLE_KEY est manquante dans les variables d'environnement de Vercel. Cette clé est indispensable pour valider, supprimer ou modifier des mots en tant qu'administrateur en contournant les politiques de sécurité (RLS) de Supabase."
    });
  }

  // SECURITÉ: Vérifier que l'utilisateur est authentifié en tant qu'administrateur
  const adminUser = await verifyAdmin(req);
  if (!adminUser) {
    return res.status(403).json({
      success: false,
      message: "Accès refusé. Vous devez être connecté en tant qu'administrateur pour effectuer cette action."
    });
  }

  try {
    if (action === 'all') {
      const page   = Math.max(1, parseInt(req.query.page  || '1', 10));
      const limit  = Math.min(100, parseInt(req.query.limit || '50', 10));
      const q      = (req.query.q || '').trim();
      const filter = req.query.filter || 'all'; // all | pending | approved | no-audio
      const type   = req.query.type || 'all'; // all | word | phrase
 
      const from = (page - 1) * limit;
      const to   = from + limit - 1;
 
      let query = supabase
        .from('words')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
 
      // Apply status filter
      if (filter === 'pending')  query = query.eq('status', 'pending');
      if (filter === 'approved') query = query.eq('status', 'approved');
      if (filter === 'no-audio') query = query.is('audio_url', null);
 
      // Apply type filter (word vs phrase)
      if (type === 'phrase') {
        query = query.in('category', ['Phrase', 'Bible']);
      } else if (type === 'word') {
        query = query.neq('category', 'Phrase').neq('category', 'Bible');
      }
 
      // Apply text search
      if (q) {
        query = query.or(`french.ilike.%${q}%,fon.ilike.%${q}%`);
      }
 
      const { data, error, count } = await query;
      if (error) throw error;

      return res.status(200).json({
        data,
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit),
        limit
      });
    }

    
    if (action === 'pending') {
      const { data, error } = await supabase
        .from('words')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data);
    } 
    
    if (action === 'approve') {
      const { id } = req.body;

      // Check current status to prevent double-approval
      const { data: currentWord, error: getError } = await supabase
        .from('words')
        .select('french, fon, status')
        .eq('id', id)
        .maybeSingle();

      if (getError) throw getError;
      if (!currentWord) {
        return res.status(404).json({ success: false, message: "Ce mot n'existe pas." });
      }
      
      if (currentWord.status === 'approved') {
        return res.status(400).json({ 
          success: false, 
          message: `Le mot ('${currentWord.french}' - '${currentWord.fon}') a déjà été approuvé et publié !` 
        });
      }

      const { data, error } = await supabase
        .from('words')
        .update({ status: 'approved' })
        .eq('id', id);
      if (error) throw error;
      
      return res.status(200).json({ 
        success: true, 
        message: `Le mot ('${currentWord.french}' - '${currentWord.fon}') a été approuvé et publié !`,
        data 
      });
    } 
    
    if (action === 'delete') {
      const { id } = req.body;

      // Check if word exists before deleting
      const { data: currentWord, error: getError } = await supabase
        .from('words')
        .select('french, fon')
        .eq('id', id)
        .maybeSingle();

      if (getError) throw getError;
      if (!currentWord) {
        return res.status(404).json({ success: false, message: "Ce mot n'existe pas ou a déjà été supprimé." });
      }

      const { error } = await supabase
        .from('words')
        .delete()
        .eq('id', id);
      if (error) throw error;
      
      return res.status(200).json({ 
        success: true, 
        message: `Le mot ('${currentWord.french}' - '${currentWord.fon}') a été supprimé définitivement.` 
      });
    } 
    
    if (action === 'update') {
      const { id, french, fon, phonetic, category, example, audio_base64, example_audio_base64 } = req.body;
      
      const uploadAudio = async (base64, name) => {
        if (!base64) return null;
        try {
          const cleanBase64 = base64.replace(/^data:.*?;base64,/, '');
          const buffer = Buffer.from(cleanBase64, 'base64');
          const fileName = `${Date.now()}_${name}.ogg`;
          
          const { error } = await supabase.storage
            .from('audios')
            .upload(fileName, buffer, { contentType: 'audio/ogg' });
          
          if (error) {
            console.error(`Storage Upload Error (${name}):`, error.message);
            return null;
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from('audios')
            .getPublicUrl(fileName);
          
          return publicUrl;
        } catch (uploadErr) {
          console.error("Critical Upload Error:", uploadErr.message);
          return null;
        }
      };

      const new_audio_url = await uploadAudio(audio_base64, 'word');
      const new_example_audio_url = await uploadAudio(example_audio_base64, 'example');

      const updatePayload = { french, fon, phonetic, category, example };
      if (new_audio_url) updatePayload.audio_url = new_audio_url;
      if (new_example_audio_url) updatePayload.example_audio_url = new_example_audio_url;

      const { data, error } = await supabase
        .from('words')
        .update(updatePayload)
        .eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true, data });
    }

    if (action === 'delete-biblical-names') {
      const BIBLICAL_PROPER_NAMES = [
        'adam', 'eve', 'éve', 'caïn', 'cain', 'abel', 'seth', 'énosch', 'enosch', 'kénan', 'kenan',
        'mahalaleel', 'jered', 'hénoc', 'henoc', 'metuschélah', 'lémec', 'lemec', 'noé', 'sem', 'cham',
        'japhet', 'abraham', 'isaac', 'jacob', 'ruben', 'siméon', 'simeon', 'lévi', 'levi', 'juda',
        'issacar', 'zabulon', 'dan', 'nephthali', 'gad', 'aser', 'benjamin', 'dinah', 'joseph',
        'pharaon', 'moïse', 'moise', 'aaron', 'marie', 'josué', 'josue', 'gédéon', 'gedeon', 'samson',
        'ruth', 'samuel', 'saül', 'saul', 'david', 'salomon', 'roboam', 'abia', 'asa', 'josaphat',
        'joram', 'ozias', 'joatham', 'achaz', 'ézéchias', 'ezechias', 'manassé', 'manasse', 'amon',
        'josias', 'jéchonias', 'jechonias', 'salathiel', 'zorobabel', 'abiud', 'éliakim', 'eliakim',
        'azor', 'sadok', 'achim', 'éliud', 'eliud', 'éléazar', 'eleazar', 'matthan', 'jésus', 'jesus',
        'christ', 'paul', 'pierre', 'jean', 'jacques', 'andré', 'andre', 'philippe', 'barthélemy',
        'barthelemy', 'thomas', 'thaddée', 'thaddee', 'simon', 'judas', 'étienne', 'etienne',
        'corneille', 'barnabé', 'barnabe', 'timothée', 'timothee', 'tite', 'silas', 'apollos',
        'lazare', 'marthe', 'zacharie', 'élisabeth', 'elisabeth', 'jean-baptiste', 'gabriel',
        'michel', 'satan', 'diable', 'hérode', 'herode', 'pilate', 'barabbas', 'sara', 'agar',
        'ismaël', 'ismael', 'rebecca', 'rachel', 'léa', 'lea', 'esau', 'ésaú', 'jézabel', 'jezabel',
        'élie', 'elie', 'élisée', 'elisee', 'isaïe', 'isaie', 'jérémie', 'jeremie', 'ézéchiel',
        'ezechiel', 'daniel', 'osée', 'osee', 'joël', 'joel', 'amos', 'abdias', 'jonas', 'michée',
        'michee', 'nahum', 'habacuc', 'sophonie', 'aggée', 'aggee', 'zacharie', 'malachie',
        'goliath', 'israël', 'israel', 'égypte', 'egypte', 'jérusalem', 'jerusalem', 'bethléem',
        'bethleem', 'nazareth', 'sinai', 'samarie', 'judée', 'judee', 'babylone', 'sodome', 'gomorrhe',
        'melchisédek', 'melchisedek', 'taanac', 'meguiddo'
      ];

      // Build unique variations (lowercase, capitalized, uppercase)
      const namesArray = [];
      BIBLICAL_PROPER_NAMES.forEach(name => {
        namesArray.push(name.toLowerCase());
        namesArray.push(name.charAt(0).toUpperCase() + name.slice(1).toLowerCase());
        namesArray.push(name.toUpperCase());
      });
      const uniqueNamesArray = [...new Set(namesArray)];

      let totalDeleted = 0;

      // 1. Delete exact matching proper names across all categories
      const { count: countExact, error: errExact } = await supabase
        .from('words')
        .delete({ count: 'exact' })
        .in('french', uniqueNamesArray);
      
      if (errExact) throw errExact;
      totalDeleted += (countExact || 0);

      // 2. Delete genealogy verses with "engendra" in Bible category
      const { count: countEngendra, error: errEngendra } = await supabase
        .from('words')
        .delete({ count: 'exact' })
        .eq('category', 'Bible')
        .ilike('french', '%engendra%');
      
      if (errEngendra) throw errEngendra;
      totalDeleted += (countEngendra || 0);

      // 3. Delete kings list verses in Bible category
      const { count: countKings, error: errKings } = await supabase
        .from('words')
        .delete({ count: 'exact' })
        .eq('category', 'Bible')
        .ilike('french', '%roi de%un;%');
      
      if (errKings) throw errKings;
      totalDeleted += (countKings || 0);

      // 4. Delete sons lists with colon in Bible category
      const { count: countSons, error: errSons } = await supabase
        .from('words')
        .delete({ count: 'exact' })
        .eq('category', 'Bible')
        .or('french.ilike.Les fils de %:%,french.ilike.Fils de %:%');
      
      if (errSons) throw errSons;
      totalDeleted += (countSons || 0);

      return res.status(200).json({
        success: true,
        message: `${totalDeleted} noms propres et versets de généalogie ont été supprimés avec succès de la base de données.`,
        countDeleted: totalDeleted
      });
    }

    if (action === 'delete-category') {
      const { category } = req.body;
      if (!category) {
        return res.status(400).json({ success: false, message: "Catégorie manquante." });
      }

      const { data, error, count } = await supabase
        .from('words')
        .delete({ count: 'exact' })
        .eq('category', category);

      if (error) throw error;

      return res.status(200).json({
        success: true,
        message: `Tous les éléments de la catégorie '${category}' ont été supprimés.`,
        countDeleted: count || 0
      });
    }

    return res.status(404).json({ error: `Admin action '${action}' not found` });
  } catch (e) {
    return res.status(500).json({ message: "Erreur", error: e.message });
  }
};
