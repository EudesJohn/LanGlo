const supabase = require('../lib/supabase');
const { verifyAdmin } = require('../lib/auth');
const { logActivity } = require('../lib/activity');

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
      if (filter === 'with-audio') query = query.not('audio_url', 'is', null);
 
      // Apply type filter (word vs phrase)
      if (type === 'phrase') {
        query = query.in('category', ['Phrase', 'Bible']);
      } else if (type === 'word') {
        query = query.neq('category', 'Phrase').neq('category', 'Bible');
      }
 
      // Apply text search
      if (q) {
        const escapedQ = q.replace(/[\\%_]/g, '\\$&').replace(/"/g, '""');
        query = query.or(`french.ilike."%${escapedQ}%",fon.ilike."%${escapedQ}%"`);
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
      
      await logActivity(adminUser, 'approve', id, currentWord.french, currentWord.fon);

      return res.status(200).json({ 
        success: true, 
        message: `Le mot ('${currentWord.french}' - '${currentWord.fon}') a été approuvé et publié !`,
        data 
      });
    }

    if (action === 'approve-all') {
      const { data: pendingList, error: fetchErr } = await supabase
        .from('words')
        .select('id, french, fon')
        .eq('status', 'pending');

      if (fetchErr) throw fetchErr;

      if (!pendingList || pendingList.length === 0) {
        return res.status(200).json({
          success: true,
          count: 0,
          message: "Aucun mot en attente d'approbation."
        });
      }

      const { error: updateErr } = await supabase
        .from('words')
        .update({ status: 'approved' })
        .eq('status', 'pending');

      if (updateErr) throw updateErr;

      for (const w of pendingList) {
        await logActivity(adminUser, 'approve', w.id, w.french, w.fon);
      }

      return res.status(200).json({
        success: true,
        count: pendingList.length,
        message: `${pendingList.length} mots ont été approuvés avec succès.`
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
      
      await logActivity(adminUser, 'delete', id, currentWord.french, currentWord.fon);

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
          if (buffer.length > 5 * 1024 * 1024) {
            throw new Error('Le fichier audio dépasse la limite de 5 Mo.');
          }
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

      // Propager automatiquement le nouvel audio à tous les doublons exacts (même français et même fon) sans audio
      if (new_audio_url && french && fon) {
        try {
          const { error: propErr } = await supabase
            .from('words')
            .update({ audio_url: new_audio_url })
            .ilike('french', french.trim())
            .ilike('fon', fon.trim())
            .is('audio_url', null);
          if (propErr) console.error("Propagation error (admin update):", propErr.message);
        } catch (err) {
          console.error("Propagation failed in admin update:", err);
        }
      }

      await logActivity(adminUser, 'update', id, french, fon);
      if (new_audio_url || new_example_audio_url) {
        await logActivity(adminUser, 'audio_added', id, french, fon);
      }

      return res.status(200).json({ success: true, data, audio_url: new_audio_url || null, example_audio_url: new_example_audio_url || null });
    }

    if (action === 'my-activity') {
      const { data: activityList, error: actError } = await supabase
        .from('admin_activity')
        .select('*')
        .eq('admin_id', adminUser.id)
        .order('created_at', { ascending: false });

      if (actError) throw actError;

      let added = 0;
      let modified = 0;
      let deleted = 0;
      let audio = 0;

      (activityList || []).forEach(row => {
        if (row.action_type === 'add' || row.action_type === 'approve') {
          added++;
        } else if (row.action_type === 'update') {
          modified++;
        } else if (row.action_type === 'delete') {
          deleted++;
        } else if (row.action_type === 'audio_added') {
          audio++;
        }
      });

      return res.status(200).json({
        success: true,
        stats: { added, modified, deleted, audio },
        history: (activityList || []).slice(0, 50)
      });
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

      return res.status(200).json({
        success: true,
        message: `${totalDeleted} noms et prénoms propres ont été supprimés avec succès de la base de données.`,
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
