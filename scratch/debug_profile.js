const supabase = require('../api/lib/supabase');

const testUpdate = async () => {
  const id = 'eb4bc4b8-8747-4732-820a-c8dc30d74182';
  const safeData = {
    name: "Eudes John Test",
    pseudo: "EudesAdmin",
    nationality: "Béninoise",
    ethnicity: "Fon",
    role: 'admin'
  };

  console.log("--- STARTING DIAGNOSTIC UPSERT ---");
  console.log("Target ID:", id);
  console.log("Data:", safeData);

  try {
    const { data, error, status, statusText } = await supabase
      .from('users')
      .upsert({ id, ...safeData })
      .select()
      .single();

    if (error) {
      console.error("❌ SUPABASE ERROR DETECTED:");
      console.error("Message:", error.message);
      console.error("Details:", error.details);
      console.error("Hint:", error.hint);
      console.error("Code:", error.code);
      console.error("Status:", status, statusText);
    } else {
      console.log("✅ SUCCESS!");
      console.log("Resulting Data:", data);
    }
  } catch (e) {
    console.error("💥 CRASH IN SCRIPT:");
    console.error(e);
  }
};

testUpdate();
