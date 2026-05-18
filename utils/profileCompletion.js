/**
 * Calculates profile completion % for a given user.
 * `user` is the merged object from deserializeUser (users JOIN profiles).
 * Returns { percentage, steps, canPostService }
 */
function getProfileCompletion(user) {
  const steps = [];

  // ── SHARED (all roles) ──────────────────────────────────────────
  steps.push({
    key: 'avatar',
    label: 'Upload a profile photo',
    done: !!user.avatar_url,
    href: '/dashboard/profile',
    points: 15,
    requiredToPost: false,
  });

  const bioWords = (user.bio || '').trim().split(/\s+/).filter(Boolean).length;
  steps.push({
    key: 'bio',
    label: 'Write an introduction (50 words minimum)',
    done: bioWords >= 50,
    href: '/dashboard/profile',
    points: 20,
    requiredToPost: true,
    detail: bioWords > 0 ? `${bioWords}/50 words` : null,
  });

  steps.push({
    key: 'location',
    label: 'Add your city/location',
    done: !!user.city,
    href: '/dashboard/profile',
    points: 10,
    requiredToPost: false,
  });

  steps.push({
    key: 'phone',
    label: 'Add your phone number',
    done: !!user.phone,
    href: '/dashboard/settings',
    points: 10,
    requiredToPost: false,
  });

  // ── WORKER ONLY ─────────────────────────────────────────────────
  if (user.role === 'worker') {
    steps.push({
      key: 'kyc',
      label: 'Verify your identity (KYC)',
      done: user.kyc_status === 'approved',
      pending: user.kyc_status === 'pending',
      rejected: user.kyc_status === 'rejected',
      href: '/dashboard/kyc',
      points: 30,
      requiredToPost: true,
    });

    steps.push({
      key: 'tagline',
      label: 'Add a professional tagline',
      done: !!user.tagline,
      href: '/dashboard/profile',
      points: 5,
      requiredToPost: false,
    });

    steps.push({
      key: 'skills',
      label: 'Add at least 3 skills',
      done: Array.isArray(user.skills) && user.skills.length >= 3,
      href: '/dashboard/profile',
      points: 10,
      requiredToPost: false,
    });
  }

  // ── Calculate ───────────────────────────────────────────────────
  const totalPoints  = steps.reduce((s, x) => s + x.points, 0);
  const earnedPoints = steps.filter(x => x.done).reduce((s, x) => s + x.points, 0);
  const percentage   = Math.round((earnedPoints / totalPoints) * 100);
  steps.forEach(step => {
    step.impact = Math.round((step.points / totalPoints) * 100);
  });

  // canPostService: worker needs avatar + 50-word bio + KYC approved
  const canPostService = user.role === 'worker'
    && !!user.avatar_url
    && bioWords >= 50
    && user.kyc_status === 'approved';

  return { steps, percentage, canPostService };
}

module.exports = { getProfileCompletion };
