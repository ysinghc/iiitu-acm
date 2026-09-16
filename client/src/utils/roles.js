export function roleLabel(role = '') {
  const map = {
    chair: 'Chair',
    vice_chair: 'Vice Chair',
    secretary: 'Secretary',
    treasurer: 'Treasurer',
    hod: 'Head of Department',
    expert: 'Expert Mentor',
    scholar: 'Scholar',
    fellow: 'Fellow',
    member: 'Member',
  };
  return map[role] || role;
}

export function cap(s = '') {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
