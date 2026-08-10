import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, LogOut, Check, X, ShieldAlert } from 'lucide-react';
import { API } from '../utils/apiURL';
import ImageUploader from '../components/ImageUploader';

export default function AdminDashboard({ theme, toggleTheme }) {
  const [activeTab, setActiveTab] = useState('carousel');
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const navigate = useNavigate();

  // Data States
  const [slides, setSlides] = useState([]);
  const [messages, setMessages] = useState([]);
  const [team, setTeam] = useState([]);
  const [members, setMembers] = useState([]);

  // Verticals State
  const [departments, setDepartments] = useState([]);
  const [interestGroups, setInterestGroups] = useState([]);
  const [verticalsSubTab, setVerticalsSubTab] = useState('departments');
  const [selectedDeptForIG, setSelectedDeptForIG] = useState('');
  const [selectedIGForMembers, setSelectedIGForMembers] = useState('');
  const [igMembers, setIGMembers] = useState([]);
  const [addMemberId, setAddMemberId] = useState('');

  // Form states (Editing vs Adding)
  const [editId, setEditId] = useState(null);
  
  // Carousel Form
  const [slideForm, setSlideForm] = useState({ title: '', description: '', imageUrl: '', order: 0 });
  // Message Form
  const [messageForm, setMessageForm] = useState({ role: 'sponsor', name: '', content: '', imageUrl: '' });
  // Team Form
  const [teamForm, setTeamForm] = useState({ name: '', role: '', imageUrl: '', github: '', linkedin: '', research: '' });
  // Member Form
  const [memberForm, setMemberForm] = useState({ name: '', role: 'Member', email: '', batch: '', imageUrl: '' });
  // Department Form
  const [deptForm, setDeptForm] = useState({ slug: '', name: '', description: '', bannerImageUrl: '', mission: '' });
  // Interest Group Form
  const [igForm, setIgForm] = useState({ department: '', igl: '', name: '', description: '', areaOfInterest: '', order: 0 });

  const getHeaders = () => {
    const token = localStorage.getItem('acm_admin_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  useEffect(() => {
    const verifyAndFetch = async () => {
      try {
        const token = localStorage.getItem('acm_admin_token');
        if (!token) {
          throw new Error('No token');
        }

        const authRes = await fetch(`${API}/admin/check-auth`, {
          headers: getHeaders()
        });

        if (!authRes.ok) {
          throw new Error('Auth failed');
        }

        // Fetch all data for management
        const [slidesRes, messagesRes, teamRes, membersRes, deptsRes, igsRes] = await Promise.all([
          fetch(`${API}/public/carousel`),
          fetch(`${API}/public/messages`),
          fetch(`${API}/public/team`),
          fetch(`${API}/public/members`),
          fetch(`${API}/public/departments`),
          fetch(`${API}/public/interest-groups`),
        ]);

        setSlides(await slidesRes.json());
        setMessages(await messagesRes.json());
        setTeam(await teamRes.json());
        setMembers(await membersRes.json());
        setDepartments(await deptsRes.json());
        setInterestGroups(await igsRes.json());
        setLoading(false);
      } catch (err) {
        console.error(err);
        setAuthError(true);
        setLoading(false);
        navigate('/admin/login');
      }
    };

    verifyAndFetch();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('acm_admin_token');
    localStorage.removeItem('acm_admin_user');
    navigate('/admin/login');
  };

  const refreshData = async (type) => {
    try {
      const res = await fetch(`${API}/public/${type}`);
      const data = await res.json();
      if (type === 'carousel') setSlides(data);
      if (type === 'messages') setMessages(data);
      if (type === 'team') setTeam(data);
      if (type === 'members') setMembers(data);
      if (type === 'departments') setDepartments(data);
      if (type === 'interest-groups') setInterestGroups(data);
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
  };

  // Department Submit
  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    const url = editId ? `${API}/admin/departments/${editId}` : `${API}/admin/departments`;
    const method = editId ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(deptForm) });
      if (res.ok) {
        setDeptForm({ slug: '', name: '', description: '', bannerImageUrl: '', mission: '' });
        setEditId(null);
        refreshData('departments');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save department');
      }
    } catch (err) { console.error(err); }
  };

  const deleteDept = async (id) => {
    if (!window.confirm('Delete this department? All interest groups will need to be reassigned.')) return;
    try {
      const res = await fetch(`${API}/admin/departments/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (res.ok) refreshData('departments');
    } catch (err) { console.error(err); }
  };

  // Interest Group Submit
  const handleIGSubmit = async (e) => {
    e.preventDefault();
    const url = editId ? `${API}/admin/interest-groups/${editId}` : `${API}/admin/interest-groups`;
    const method = editId ? 'PUT' : 'POST';
    try {
      const payload = { ...igForm, igl: igForm.igl || null, order: Number(igForm.order) || 0 };
      const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(payload) });
      if (res.ok) {
        setIgForm({ department: '', igl: '', name: '', description: '', areaOfInterest: '', order: 0 });
        setEditId(null);
        refreshData('interest-groups');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save interest group');
      }
    } catch (err) { console.error(err); }
  };

  const deleteIG = async (id) => {
    if (!window.confirm('Delete this interest group and all its memberships?')) return;
    try {
      const res = await fetch(`${API}/admin/interest-groups/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (res.ok) refreshData('interest-groups');
    } catch (err) { console.error(err); }
  };

  // Membership Management
  const loadIGMembers = async (igId) => {
    if (!igId) { setIGMembers([]); return; }
    try {
      const res = await fetch(`${API}/public/interest-groups/${igId}/members`);
      const data = await res.json();
      setIGMembers(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const handleAddMember = async () => {
    if (!selectedIGForMembers || !addMemberId) return;
    try {
      const res = await fetch(`${API}/admin/interest-groups/${selectedIGForMembers}/members`, {
        method: 'POST', headers: getHeaders(), body: JSON.stringify({ memberId: addMemberId })
      });
      if (res.ok) { setAddMemberId(''); loadIGMembers(selectedIGForMembers); }
      else { const e = await res.json(); alert(e.error || 'Failed to add'); }
    } catch (err) { console.error(err); }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Remove this member from the group?')) return;
    try {
      const res = await fetch(`${API}/admin/interest-groups/${selectedIGForMembers}/members/${memberId}`, {
        method: 'DELETE', headers: getHeaders()
      });
      if (res.ok) loadIGMembers(selectedIGForMembers);
    } catch (err) { console.error(err); }
  };

  // --- CRUD API HANDLERS ---

  // Carousel Slide Submit
  const handleSlideSubmit = async (e) => {
    e.preventDefault();
    const url = editId ? `${API}/admin/carousel/${editId}` : `${API}/admin/carousel`;
    const method = editId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(slideForm)
      });
      if (res.ok) {
        setSlideForm({ title: '', description: '', imageUrl: '', order: 0 });
        setEditId(null);
        refreshData('carousel');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteSlide = async (id) => {
    if (!window.confirm('Delete this slide?')) return;
    try {
      const res = await fetch(`${API}/admin/carousel/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) refreshData('carousel');
    } catch (err) {
      console.error(err);
    }
  };

  // Message Submit
  const handleMessageSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/admin/messages/${messageForm.role}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          name: messageForm.name,
          content: messageForm.content,
          imageUrl: messageForm.imageUrl
        })
      });
      if (res.ok) {
        refreshData('messages');
        alert('Message updated successfully');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Team Submit
  const handleTeamSubmit = async (e) => {
    e.preventDefault();
    const url = editId ? `${API}/admin/team/${editId}` : `${API}/admin/team`;
    const method = editId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(teamForm)
      });
      if (res.ok) {
        setTeamForm({ name: '', role: '', imageUrl: '', github: '', linkedin: '', research: '' });
        setEditId(null);
        refreshData('team');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTeamMember = async (id) => {
    if (!window.confirm('Delete this team member?')) return;
    try {
      const res = await fetch(`${API}/admin/team/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) refreshData('team');
    } catch (err) {
      console.error(err);
    }
  };

  // Member Submit
  const handleMemberSubmit = async (e) => {
    e.preventDefault();
    const url = editId ? `${API}/admin/members/${editId}` : `${API}/admin/members`;
    const method = editId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(memberForm)
      });
      if (res.ok) {
        setMemberForm({ name: '', role: 'Member', email: '', batch: '', imageUrl: '' });
        setEditId(null);
        refreshData('members');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteMember = async (id) => {
    if (!window.confirm('Delete this member?')) return;
    try {
      const res = await fetch(`${API}/admin/members/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) refreshData('members');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px] bg-bg-primary">
        <div className="text-sm font-medium text-text-secondary animate-pulse">Authenticating Administrator...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col md:flex-row transition-colors duration-300">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-60 bg-bg-secondary text-text-primary flex flex-col border-r border-border-color transition-colors duration-300">
        <div className="p-5 flex items-center justify-between border-b border-border-color">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-text-primary">ADMIN PORTAL</h2>
            <p className="text-[10px] text-text-secondary font-medium">IIITU ACM Student Chapter</p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-bg-primary text-text-secondary hover:text-red-500 transition-colors focus:outline-none"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5">
          {[
            { id: 'carousel', label: 'Hero Slides' },
            { id: 'messages', label: 'Chapter Messages' },
            { id: 'team', label: 'Executive Board' },
            { id: 'members', label: 'Chapter Members' },
            { id: 'verticals', label: 'Verticals' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setEditId(null);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-acm-blue text-white shadow-sm'
                  : 'hover:bg-bg-primary text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Workspace Area */}
      <main className="flex-1 p-6 md:p-10 max-w-6xl">
        {/* CAROUSEL MANAGEMENT TAB */}
        {activeTab === 'carousel' && (
          <div className="space-y-8">
            <div className="border-b border-border-color pb-4">
              <h1 className="text-xl font-bold tracking-tight text-text-primary">Hero Slides</h1>
              <p className="text-xs text-text-secondary mt-1">Configure and order slides on the homepage carousel.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form */}
              <div className="bg-bg-secondary p-6 rounded-2xl border border-border-color shadow-sm transition-colors duration-300">
                <h3 className="text-sm font-bold text-text-primary border-b border-border-color pb-3 mb-4 uppercase tracking-wider">
                  {editId ? 'Edit Slide Details' : 'Add New Slide'}
                </h3>
                <form onSubmit={handleSlideSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 tracking-wide">Slide Title</label>
                    <input
                      type="text"
                      required
                      value={slideForm.title}
                      onChange={(e) => setSlideForm({ ...slideForm, title: e.target.value })}
                      className="w-full px-3 py-2 border border-border-color rounded-xl bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-acm-blue text-xs transition-colors duration-300"
                      placeholder="e.g. Codeathon 2026"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 tracking-wide">Description</label>
                    <textarea
                      value={slideForm.description}
                      onChange={(e) => setSlideForm({ ...slideForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-border-color rounded-xl bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-acm-blue text-xs transition-colors duration-300"
                      placeholder="Slide caption text..."
                      rows="3"
                    />
                  </div>
                  <ImageUploader
                    label="Slide Image"
                    required
                    value={slideForm.imageUrl}
                    onChange={(url) => setSlideForm({ ...slideForm, imageUrl: url })}
                  />
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 tracking-wide">Display Order</label>
                    <input
                      type="number"
                      required
                      value={slideForm.order}
                      onChange={(e) => setSlideForm({ ...slideForm, order: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-border-color rounded-xl bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-acm-blue text-xs transition-colors duration-300"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-acm-blue hover:bg-acm-dark text-white font-semibold py-2 px-4 rounded-xl text-xs transition-colors"
                    >
                      {editId ? 'Save' : 'Publish'}
                    </button>
                    {editId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditId(null);
                          setSlideForm({ title: '', description: '', imageUrl: '', order: 0 });
                        }}
                        className="bg-bg-primary hover:bg-border-color text-text-primary font-semibold py-2 px-4 rounded-xl text-xs transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* List */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-sm font-bold text-text-primary border-b border-border-color pb-3 uppercase tracking-wider">Active Slides</h3>
                {slides.length === 0 ? (
                  <p className="text-xs text-text-secondary italic">No slides available.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {slides.map((slide) => (
                      <div key={slide._id} className="bg-bg-secondary border border-border-color rounded-2xl overflow-hidden shadow-sm transition-colors duration-300 flex flex-col">
                        <img
                          src={slide.imageUrl}
                          alt={slide.title}
                          className="h-32 w-full object-cover border-b border-border-color"
                        />
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <span className="bg-acm-blue/10 text-acm-blue text-[9px] font-bold px-2 py-0.5 rounded-full uppercase mb-2 inline-block">
                              Order: {slide.order}
                            </span>
                            <h4 className="font-bold text-text-primary text-sm">{slide.title}</h4>
                            <p className="text-text-secondary text-xs mt-1 line-clamp-2">{slide.description}</p>
                          </div>

                          <div className="flex gap-4 mt-4 pt-3 border-t border-border-color">
                            <button
                              onClick={() => {
                                setEditId(slide._id);
                                setSlideForm({
                                  title: slide.title,
                                  description: slide.description || '',
                                  imageUrl: slide.imageUrl,
                                  order: slide.order
                                });
                              }}
                              className="text-acm-blue hover:text-acm-dark text-[11px] font-bold flex items-center gap-1 uppercase"
                            >
                              <Edit2 className="h-3 w-3" /> Edit
                            </button>
                            <button
                              onClick={() => deleteSlide(slide._id)}
                              className="text-red-500 hover:text-red-700 text-[11px] font-bold flex items-center gap-1 uppercase ml-auto"
                            >
                              <Trash2 className="h-3 w-3" /> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MESSAGES MANAGEMENT TAB */}
        {activeTab === 'messages' && (
          <div className="space-y-8">
            <div className="border-b border-border-color pb-4">
              <h1 className="text-xl font-bold tracking-tight text-text-primary">Chapter Messages</h1>
              <p className="text-xs text-text-secondary mt-1">Edit greetings and details from the Sponsor and Chairman.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Form */}
              <div className="bg-bg-secondary p-6 rounded-2xl border border-border-color shadow-sm transition-colors duration-300">
                <h3 className="text-sm font-bold text-text-primary border-b border-border-color pb-3 mb-4 uppercase tracking-wider">
                  Update Official Message
                </h3>
                <form onSubmit={handleMessageSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 tracking-wide">Target Role</label>
                    <select
                      value={messageForm.role}
                      onChange={(e) => {
                        const role = e.target.value;
                        const existing = messages.find(m => m.role === role);
                        setMessageForm({
                          role,
                          name: existing ? existing.name : '',
                          content: existing ? existing.content : '',
                          imageUrl: existing ? existing.imageUrl || '' : ''
                        });
                      }}
                      className="w-full px-3 py-2 border border-border-color rounded-xl bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-acm-blue text-xs transition-colors duration-300"
                    >
                      <option value="sponsor">Faculty Sponsor</option>
                      <option value="chairman">Student Chairman</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 tracking-wide">Official Name</label>
                    <input
                      type="text"
                      required
                      value={messageForm.name}
                      onChange={(e) => setMessageForm({ ...messageForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-border-color rounded-xl bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-acm-blue text-xs transition-colors duration-300"
                      placeholder="e.g. Dr. Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 tracking-wide">Message Content</label>
                    <textarea
                      required
                      value={messageForm.content}
                      onChange={(e) => setMessageForm({ ...messageForm, content: e.target.value })}
                      className="w-full px-3 py-2 border border-border-color rounded-xl bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-acm-blue text-xs transition-colors duration-300"
                      placeholder="Write message contents here..."
                      rows="6"
                    />
                  </div>
                  <ImageUploader
                    label="Official Photo"
                    value={messageForm.imageUrl}
                    onChange={(url) => setMessageForm({ ...messageForm, imageUrl: url })}
                  />

                  <button
                    type="submit"
                    className="w-full bg-acm-blue hover:bg-acm-dark text-white font-semibold py-2 px-4 rounded-xl text-xs transition-colors"
                  >
                    Save Changes
                  </button>
                </form>
              </div>

              {/* Preview */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-text-primary border-b border-border-color pb-3 uppercase tracking-wider">Current Messages</h3>
                {messages.map((msg) => (
                  <div key={msg._id} className="bg-bg-secondary border border-border-color p-4 rounded-2xl shadow-sm transition-colors duration-300 flex gap-4">
                    {msg.imageUrl && (
                      <img
                        src={msg.imageUrl}
                        alt={msg.name}
                        className="w-20 h-20 rounded-xl object-cover border border-border-color flex-shrink-0"
                      />
                    )}
                    <div>
                      <span className="bg-acm-blue/10 text-acm-blue text-[8px] font-bold px-2 py-0.5 rounded-full uppercase mb-1.5 inline-block">
                        {msg.role === 'sponsor' ? 'Faculty Sponsor' : 'Chairman'}
                      </span>
                      <h4 className="font-bold text-text-primary text-sm">{msg.name}</h4>
                      <p className="text-text-secondary text-xs mt-1.5 line-clamp-3 whitespace-pre-line">{msg.content}</p>
                      <button
                        onClick={() => {
                          setMessageForm({
                            role: msg.role,
                            name: msg.name,
                            content: msg.content,
                            imageUrl: msg.imageUrl || ''
                          });
                        }}
                        className="text-acm-blue hover:text-acm-dark text-xs font-bold flex items-center gap-1 uppercase mt-3"
                      >
                        <Edit2 className="h-3 w-3" /> Quick Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TEAM MEMBERS MANAGEMENT TAB */}
        {activeTab === 'team' && (
          <div className="space-y-8">
            <div className="border-b border-border-color pb-4">
              <h1 className="text-xl font-bold tracking-tight text-text-primary">Executive Board</h1>
              <p className="text-xs text-text-secondary mt-1">Manage the executive officers of the chapter.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form */}
              <div className="bg-bg-secondary p-6 rounded-2xl border border-border-color shadow-sm transition-colors duration-300">
                <h3 className="text-sm font-bold text-text-primary border-b border-border-color pb-3 mb-4 uppercase tracking-wider">
                  {editId ? 'Edit Officer Info' : 'Add New Officer'}
                </h3>
                <form onSubmit={handleTeamSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 tracking-wide">Full Name</label>
                    <input
                      type="text"
                      required
                      value={teamForm.name}
                      onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-border-color rounded-xl bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-acm-blue text-xs transition-colors duration-300"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 tracking-wide">Role / Designation</label>
                    <input
                      type="text"
                      required
                      value={teamForm.role}
                      onChange={(e) => setTeamForm({ ...teamForm, role: e.target.value })}
                      className="w-full px-3 py-2 border border-border-color rounded-xl bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-acm-blue text-xs transition-colors duration-300"
                      placeholder="e.g. Vice Chairman"
                    />
                  </div>
                  <ImageUploader
                    label="Officer Photo"
                    value={teamForm.imageUrl}
                    onChange={(url) => setTeamForm({ ...teamForm, imageUrl: url })}
                  />
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 tracking-wide">GitHub URL</label>
                    <input
                      type="url"
                      value={teamForm.github}
                      onChange={(e) => setTeamForm({ ...teamForm, github: e.target.value })}
                      className="w-full px-3 py-2 border border-border-color rounded-xl bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-acm-blue text-xs transition-colors duration-300"
                      placeholder="https://github.com/username"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 tracking-wide">LinkedIn URL</label>
                    <input
                      type="url"
                      value={teamForm.linkedin}
                      onChange={(e) => setTeamForm({ ...teamForm, linkedin: e.target.value })}
                      className="w-full px-3 py-2 border border-border-color rounded-xl bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-acm-blue text-xs transition-colors duration-300"
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 tracking-wide">Research Link (Faculty)</label>
                    <input
                      type="url"
                      value={teamForm.research || ''}
                      onChange={(e) => setTeamForm({ ...teamForm, research: e.target.value })}
                      className="w-full px-3 py-2 border border-border-color rounded-xl bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-acm-blue text-xs transition-colors duration-300"
                      placeholder="Google Scholar or ResearchGate URL"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-acm-blue hover:bg-acm-dark text-white font-semibold py-2 px-4 rounded-xl text-xs transition-colors"
                    >
                      {editId ? 'Save' : 'Register'}
                    </button>
                    {editId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditId(null);
                          setTeamForm({ name: '', role: '', imageUrl: '', github: '', linkedin: '', research: '' });
                        }}
                        className="bg-bg-primary hover:bg-border-color text-text-primary font-semibold py-2 px-4 rounded-xl text-xs transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* List */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-sm font-bold text-text-primary border-b border-border-color pb-3 uppercase tracking-wider">Board Roster</h3>
                {team.length === 0 ? (
                  <p className="text-xs text-text-secondary italic">No board officers added yet.</p>
                ) : (
                  <div className="bg-bg-secondary border border-border-color rounded-2xl overflow-hidden shadow-sm transition-colors duration-300">
                    <table className="min-w-full divide-y divide-border-color">
                      <thead className="bg-bg-primary text-text-primary text-xs font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-3 text-left">Officer</th>
                          <th className="px-6 py-3 text-left">Role</th>
                          <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-color text-xs">
                        {team.map((t) => (
                          <tr key={t._id} className="hover:bg-bg-primary/50 transition-colors">
                            <td className="px-6 py-4 flex items-center gap-3 font-semibold text-text-primary">
                              {t.imageUrl && (
                                <img src={t.imageUrl} alt={t.name} className="w-7 h-7 rounded-full object-cover" />
                              )}
                              {t.name}
                            </td>
                            <td className="px-6 py-4 font-semibold text-acm-blue uppercase">{t.role}</td>
                            <td className="px-6 py-4 text-right space-x-3">
                              <button
                                onClick={() => {
                                  setEditId(t._id);
                                  setTeamForm({
                                    name: t.name,
                                    role: t.role,
                                    imageUrl: t.imageUrl || '',
                                    github: t.github || '',
                                    linkedin: t.linkedin || '',
                                    research: t.research || ''
                                  });
                                }}
                                className="text-acm-blue hover:text-acm-dark font-bold text-xs uppercase"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteTeamMember(t._id)}
                                className="text-red-500 hover:text-red-700 font-bold text-xs uppercase"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* GENERAL MEMBERS MANAGEMENT TAB */}
        {activeTab === 'members' && (
          <div className="space-y-8">
            <div className="border-b border-border-color pb-4">
              <h1 className="text-xl font-bold tracking-tight text-text-primary">Chapter Members</h1>
              <p className="text-xs text-text-secondary mt-1">Manage general chapter membership directory.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form */}
              <div className="bg-bg-secondary p-6 rounded-2xl border border-border-color shadow-sm transition-colors duration-300">
                <h3 className="text-sm font-bold text-text-primary border-b border-border-color pb-3 mb-4 uppercase tracking-wider">
                  {editId ? 'Edit Member Details' : 'Add New Member'}
                </h3>
                <form onSubmit={handleMemberSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 tracking-wide">Full Name</label>
                    <input
                      type="text"
                      required
                      value={memberForm.name}
                      onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-border-color rounded-xl bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-acm-blue text-xs transition-colors duration-300"
                      placeholder="e.g. Alice Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 tracking-wide">Role / Designation</label>
                    <input
                      type="text"
                      value={memberForm.role}
                      onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                      className="w-full px-3 py-2 border border-border-color rounded-xl bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-acm-blue text-xs transition-colors duration-300"
                      placeholder="e.g. Member, Technical Lead"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 tracking-wide">Email Address</label>
                    <input
                      type="email"
                      value={memberForm.email}
                      onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-border-color rounded-xl bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-acm-blue text-xs transition-colors duration-300"
                      placeholder="alice@iiitu.ac.in"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 tracking-wide">Batch / Duration</label>
                    <input
                      type="text"
                      required
                      value={memberForm.batch}
                      onChange={(e) => setMemberForm({ ...memberForm, batch: e.target.value })}
                      className="w-full px-3 py-2 border border-border-color rounded-xl bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-acm-blue text-xs transition-colors duration-300"
                      placeholder="e.g. 2023-2027"
                    />
                  </div>
                  <ImageUploader
                    label="Profile Picture"
                    value={memberForm.imageUrl}
                    onChange={(url) => setMemberForm({ ...memberForm, imageUrl: url })}
                  />

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-acm-blue hover:bg-acm-dark text-white font-semibold py-2 px-4 rounded-xl text-xs transition-colors"
                    >
                      {editId ? 'Save' : 'Register'}
                    </button>
                    {editId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditId(null);
                          setMemberForm({ name: '', role: 'Member', email: '', batch: '', imageUrl: '' });
                        }}
                        className="bg-bg-primary hover:bg-border-color text-text-primary font-semibold py-2 px-4 rounded-xl text-xs transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* List */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-sm font-bold text-text-primary border-b border-border-color pb-3 uppercase tracking-wider">Member Roster</h3>
                {members.length === 0 ? (
                  <p className="text-xs text-text-secondary italic">No members registered yet.</p>
                ) : (
                  <div className="bg-bg-secondary border border-border-color rounded-2xl overflow-hidden shadow-sm transition-colors duration-300">
                    <table className="min-w-full divide-y divide-border-color">
                      <thead className="bg-bg-primary text-text-primary text-xs font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-3 text-left">Member</th>
                          <th className="px-6 py-3 text-left">Batch</th>
                          <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-color text-xs">
                        {members.map((m) => (
                          <tr key={m._id} className="hover:bg-bg-primary/50 transition-colors">
                            <td className="px-6 py-4 flex items-center gap-3">
                              {m.imageUrl ? (
                                <img src={m.imageUrl} alt={m.name} className="w-8 h-8 rounded-full object-cover border border-border-color flex-shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-acm-blue/10 text-acm-blue font-bold text-xs flex items-center justify-center flex-shrink-0 uppercase">
                                  {m.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-text-primary">{m.name}</div>
                                <div className="text-[10px] text-text-secondary">{m.email || 'No Email'}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-semibold text-acm-blue">{m.batch}</td>
                            <td className="px-6 py-4 text-right space-x-3">
                              <button
                                onClick={() => {
                                  setEditId(m._id);
                                  setMemberForm({
                                    name: m.name,
                                    role: m.role || 'Member',
                                    email: m.email || '',
                                    batch: m.batch,
                                    imageUrl: m.imageUrl || ''
                                  });
                                }}
                                className="text-acm-blue hover:text-acm-dark font-bold text-xs uppercase"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteMember(m._id)}
                                className="text-red-500 hover:text-red-700 font-bold text-xs uppercase"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VERTICALS MANAGEMENT TAB */}
        {activeTab === 'verticals' && (
          <div className="space-y-8">
            <div className="border-b border-border-color pb-4">
              <h1 className="text-xl font-bold tracking-tight text-text-primary">Departments & Verticals</h1>
              <p className="text-xs text-text-secondary mt-1">Manage Engineering and Research departments, interest groups, and member assignments.</p>
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-2 border-b border-border-color pb-0">
              {['departments', 'interest-groups', 'memberships'].map(sub => (
                <button
                  key={sub}
                  onClick={() => { setVerticalsSubTab(sub); setEditId(null); }}
                  className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all capitalize ${
                    verticalsSubTab === sub
                      ? 'border-acm-blue text-acm-blue'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {sub.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </button>
              ))}
            </div>

            {/* --- Departments Sub-tab --- */}
            {verticalsSubTab === 'departments' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form */}
                <div className="bg-bg-secondary p-6 rounded-2xl border border-border-color shadow-sm">
                  <h3 className="text-sm font-bold text-text-primary border-b border-border-color pb-3 mb-4 uppercase tracking-wider">
                    {editId ? 'Edit Department' : 'Add Department'}
                  </h3>
                  <form onSubmit={handleDeptSubmit} className="space-y-3">
                    {[{label:'Slug (e.g. engineering)', field:'slug', type:'text', req:true},
                      {label:'Display Name', field:'name', type:'text', req:true},
                    ].map(({label,field,type,req}) => (
                      <div key={field}>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 tracking-wide">{label}</label>
                        <input type={type} required={req} value={deptForm[field]}
                          onChange={e => setDeptForm({...deptForm, [field]: e.target.value})}
                          className="w-full px-3 py-2 border border-border-color rounded-xl bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-acm-blue text-xs"
                        />
                      </div>
                    ))}
                    <ImageUploader
                      label="Banner Image"
                      value={deptForm.bannerImageUrl}
                      onChange={(url) => setDeptForm({ ...deptForm, bannerImageUrl: url })}
                    />
                    {[{label:'Description', field:'description'},{label:'Mission', field:'mission'}].map(({label,field}) => (
                      <div key={field}>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 tracking-wide">{label}</label>
                        <textarea rows="3" value={deptForm[field]}
                          onChange={e => setDeptForm({...deptForm, [field]: e.target.value})}
                          className="w-full px-3 py-2 border border-border-color rounded-xl bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-acm-blue text-xs"
                        />
                      </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <button type="submit" className="flex-1 py-2 bg-acm-blue text-white text-xs font-bold rounded-xl hover:bg-acm-blue/90 transition-colors">
                        {editId ? 'Update Department' : 'Add Department'}
                      </button>
                      {editId && (
                        <button type="button" onClick={() => { setEditId(null); setDeptForm({ slug: '', name: '', description: '', bannerImageUrl: '', mission: '' }); }}
                          className="px-3 py-2 border border-border-color rounded-xl text-xs text-text-secondary hover:bg-bg-elevated transition-colors">
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* List */}
                <div className="lg:col-span-2 space-y-3">
                  {departments.length === 0 ? (
                    <div className="bg-bg-secondary border border-dashed border-border-color rounded-2xl p-8 text-center text-xs text-text-tertiary">No departments yet. Add one.</div>
                  ) : departments.map(dept => (
                    <div key={dept._id} className="bg-bg-secondary border border-border-color rounded-xl p-4 flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold bg-acm-blue/10 text-acm-blue px-2 py-0.5 rounded-full font-mono">{dept.slug}</span>
                          <p className="text-sm font-bold text-text-primary">{dept.name}</p>
                        </div>
                        {dept.description && <p className="text-xs text-text-secondary mt-1 line-clamp-2">{dept.description}</p>}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => { setEditId(dept._id); setDeptForm({ slug: dept.slug, name: dept.name, description: dept.description || '', bannerImageUrl: dept.bannerImageUrl || '', mission: dept.mission || '' }); }}
                          className="text-acm-blue hover:text-acm-blue/70 font-bold text-xs uppercase">Edit</button>
                        <button onClick={() => deleteDept(dept._id)}
                          className="text-red-500 hover:text-red-700 font-bold text-xs uppercase">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --- Interest Groups Sub-tab --- */}
            {verticalsSubTab === 'interest-groups' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form */}
                <div className="bg-bg-secondary p-6 rounded-2xl border border-border-color shadow-sm">
                  <h3 className="text-sm font-bold text-text-primary border-b border-border-color pb-3 mb-4 uppercase tracking-wider">
                    {editId ? 'Edit Interest Group' : 'Add Interest Group'}
                  </h3>
                  <form onSubmit={handleIGSubmit} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 tracking-wide">Department</label>
                      <select required value={igForm.department}
                        onChange={e => setIgForm({...igForm, department: e.target.value})}
                        className="w-full px-3 py-2 border border-border-color rounded-xl bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-acm-blue text-xs">
                        <option value="">Select department...</option>
                        {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 tracking-wide">Group Lead (IGL)</label>
                      <select value={igForm.igl}
                        onChange={e => setIgForm({...igForm, igl: e.target.value})}
                        className="w-full px-3 py-2 border border-border-color rounded-xl bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-acm-blue text-xs">
                        <option value="">No IGL assigned</option>
                        {team.map(t => <option key={t._id} value={t._id}>{t.name} — {t.role}</option>)}
                      </select>
                    </div>
                    {[{label:'Group Name', field:'name', req:true},{label:'Area of Interest (short)', field:'areaOfInterest', req:false}].map(({label,field,req}) => (
                      <div key={field}>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 tracking-wide">{label}</label>
                        <input type="text" required={req} value={igForm[field]}
                          onChange={e => setIgForm({...igForm, [field]: e.target.value})}
                          className="w-full px-3 py-2 border border-border-color rounded-xl bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-acm-blue text-xs"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 tracking-wide">Description</label>
                      <textarea rows="3" value={igForm.description}
                        onChange={e => setIgForm({...igForm, description: e.target.value})}
                        className="w-full px-3 py-2 border border-border-color rounded-xl bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-acm-blue text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 tracking-wide">Display Order</label>
                      <input type="number" value={igForm.order}
                        onChange={e => setIgForm({...igForm, order: e.target.value})}
                        className="w-full px-3 py-2 border border-border-color rounded-xl bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-acm-blue text-xs"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button type="submit" className="flex-1 py-2 bg-acm-blue text-white text-xs font-bold rounded-xl hover:bg-acm-blue/90 transition-colors">
                        {editId ? 'Update Group' : 'Add Group'}
                      </button>
                      {editId && (
                        <button type="button" onClick={() => { setEditId(null); setIgForm({ department: '', igl: '', name: '', description: '', areaOfInterest: '', order: 0 }); }}
                          className="px-3 py-2 border border-border-color rounded-xl text-xs text-text-secondary hover:bg-bg-elevated transition-colors">Cancel</button>
                      )}
                    </div>
                  </form>
                </div>

                {/* List */}
                <div className="lg:col-span-2">
                  <div className="mb-3">
                    <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 tracking-wide">Filter by Department</label>
                    <select value={selectedDeptForIG} onChange={e => setSelectedDeptForIG(e.target.value)}
                      className="px-3 py-2 border border-border-color rounded-xl bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-acm-blue text-xs">
                      <option value="">All Departments</option>
                      {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    {(selectedDeptForIG
                      ? interestGroups.filter(g => (g.department?._id || g.department) === selectedDeptForIG)
                      : interestGroups
                    ).length === 0 ? (
                      <div className="bg-bg-secondary border border-dashed border-border-color rounded-2xl p-8 text-center text-xs text-text-tertiary">No interest groups. Add one.</div>
                    ) : (selectedDeptForIG
                      ? interestGroups.filter(g => (g.department?._id || g.department) === selectedDeptForIG)
                      : interestGroups
                    ).map(g => (
                      <div key={g._id} className="bg-bg-secondary border border-border-color rounded-xl p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-text-primary">{g.name}</p>
                            {g.department?.name && <span className="text-[10px] text-text-tertiary">{g.department.name}</span>}
                            {g.areaOfInterest && <span className="text-[10px] text-acm-blue ml-2">· {g.areaOfInterest}</span>}
                            {g.igl?.name && <p className="text-xs text-text-secondary mt-0.5">IGL: {g.igl.name}</p>}
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button onClick={() => {
                              setEditId(g._id);
                              setIgForm({
                                department: g.department?._id || g.department || '',
                                igl: g.igl?._id || g.igl || '',
                                name: g.name, description: g.description || '',
                                areaOfInterest: g.areaOfInterest || '', order: g.order || 0
                              });
                            }} className="text-acm-blue hover:text-acm-blue/70 font-bold text-xs uppercase">Edit</button>
                            <button onClick={() => deleteIG(g._id)} className="text-red-500 hover:text-red-700 font-bold text-xs uppercase">Delete</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* --- Memberships Sub-tab --- */}
            {verticalsSubTab === 'memberships' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 tracking-wide">Select Interest Group</label>
                    <select value={selectedIGForMembers}
                      onChange={e => { setSelectedIGForMembers(e.target.value); loadIGMembers(e.target.value); }}
                      className="w-full px-3 py-2 border border-border-color rounded-xl bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-acm-blue text-xs">
                      <option value="">Choose a group...</option>
                      {interestGroups.map(g => (
                        <option key={g._id} value={g._id}>{g.department?.name ? `[${g.department.name}] ` : ''}{g.name}</option>
                      ))}
                    </select>
                  </div>
                  {selectedIGForMembers && (
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 tracking-wide">Add Member</label>
                      <div className="flex gap-2">
                        <select value={addMemberId} onChange={e => setAddMemberId(e.target.value)}
                          className="flex-1 px-3 py-2 border border-border-color rounded-xl bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-acm-blue text-xs">
                          <option value="">Select member...</option>
                          {members
                            .filter(m => !igMembers.find(im => im._id === m._id))
                            .map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                        </select>
                        <button onClick={handleAddMember}
                          className="px-4 py-2 bg-acm-blue text-white text-xs font-bold rounded-xl hover:bg-acm-blue/90 transition-colors whitespace-nowrap">Add</button>
                      </div>
                    </div>
                  )}
                </div>

                {selectedIGForMembers && (
                  <div>
                    <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-3">
                      Enrolled Members ({igMembers.length})
                    </p>
                    {igMembers.length === 0 ? (
                      <div className="bg-bg-secondary border border-dashed border-border-color rounded-xl p-6 text-center text-xs text-text-tertiary">No members enrolled in this group yet.</div>
                    ) : (
                      <div className="space-y-2">
                        {igMembers.map(m => (
                          <div key={m._id} className="bg-bg-secondary border border-border-color rounded-xl px-4 py-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-text-primary">{m.name}</p>
                              {m.batch && <p className="text-[10px] text-text-tertiary">{m.batch}</p>}
                            </div>
                            <button onClick={() => handleRemoveMember(m._id)}
                              className="text-red-500 hover:text-red-700 text-xs font-bold uppercase">Remove</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
