async function createInitialHelpGuidancePreferences(connection, userId) {
  await connection.query(
    `INSERT INTO help_guidance_preferences
      (user_id, onboarding_completed, onboarding_dismissed, tour_status, tour_step)
     VALUES (?, FALSE, FALSE, 'not_started', 0)`,
    [userId],
  );
}

module.exports = { createInitialHelpGuidancePreferences };
