// Placeholder test for repeatability helpers
// Full implementation would check cooldowns and daily reset logic

describe('Repeatability Rules', () => {
  describe('Daily jobs', () => {
    it('should be marked as available if not completed today', () => {
      const lastCompletedAt: Date | null = null;
      const isAvailable = isDailyJobAvailable(lastCompletedAt);
      expect(isAvailable).toBe(true);
    });

    it('should not be available if completed today', () => {
      const now = new Date();
      const isAvailable = isDailyJobAvailable(now);
      expect(isAvailable).toBe(false);
    });

    it('should be available if completed yesterday', () => {
      const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000);
      const isAvailable = isDailyJobAvailable(yesterday);
      expect(isAvailable).toBe(true);
    });
  });

  describe('Cooldown jobs', () => {
    it('should be available if cooldown has passed', () => {
      const lastCompletedAt = new Date(Date.now() - 5 * 60 * 60 * 1000); // 5 hours ago
      const cooldownHours = 4;
      const isAvailable = isCooldownJobAvailable(lastCompletedAt, cooldownHours);
      expect(isAvailable).toBe(true);
    });

    it('should not be available if still in cooldown', () => {
      const lastCompletedAt = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const cooldownHours = 4;
      const isAvailable = isCooldownJobAvailable(lastCompletedAt, cooldownHours);
      expect(isAvailable).toBe(false);
    });
  });
});

// Helper functions (would normally be in the game-rules library)
function isDailyJobAvailable(lastCompletedAt: Date | null): boolean {
  if (!lastCompletedAt) return true;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return lastCompletedAt < todayStart;
}

function isCooldownJobAvailable(lastCompletedAt: Date, cooldownHours: number): boolean {
  const cooldownMs = cooldownHours * 60 * 60 * 1000;
  return Date.now() - lastCompletedAt.getTime() >= cooldownMs;
}
