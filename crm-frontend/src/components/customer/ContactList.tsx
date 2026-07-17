import { useState } from 'react'
import { toast } from 'sonner'
import GlassPanel from '@/components/glass/GlassPanel'
import GlassModal from '@/components/glass/GlassModal'
import { useCustomers } from '@/hooks/useCustomers'
import type { UpdateContactInput } from '@/hooks/useCustomers'
import { useAuth } from '@/hooks/useAuth'
import type { Contact } from '@/types'
import { Phone, Briefcase, Plus, ChevronDown, ChevronUp, Pencil, Trash2, MessageSquare } from 'lucide-react'

interface ContactListProps {
  contacts: Contact[]
  customerId: string
  canEdit: boolean
}

export default function ContactList({ contacts, customerId, canEdit }: ContactListProps) {
  const [expanded, setExpanded] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactPosition, setContactPosition] = useState('')
  const [contactDesc, setContactDesc] = useState('')
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [editContactName, setEditContactName] = useState('')
  const [editContactPhone, setEditContactPhone] = useState('')
  const [editContactPosition, setEditContactPosition] = useState('')
  const [editContactDesc, setEditContactDesc] = useState('')
  const [describingContactId, setDescribingContactId] = useState<string | null>(null)
  const [newDescription, setNewDescription] = useState('')
  const { addContact, updateContact, deleteContact } = useCustomers()
  const { user } = useAuth()

  const resetForm = () => {
    setContactName('')
    setContactPhone('')
    setContactPosition('')
    setContactDesc('')
  }

  const handleSave = () => {
    if (!contactName.trim()) {
      toast.error('请填写联系人姓名')
      return
    }
    addContact(customerId, {
      name: contactName.trim(),
      phone: contactPhone.trim(),
      position: contactPosition.trim(),
      description: contactDesc.trim() || undefined,
    })
    toast.success('联系人已添加')
    resetForm()
    setShowAdd(false)
  }

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact)
    setEditContactName(contact.name)
    setEditContactPhone(contact.phone)
    setEditContactPosition(contact.position)
    setEditContactDesc(contact.description || '')
  }

  const handleUpdateContact = () => {
    if (!editingContact) return
    if (!editContactName.trim()) {
      toast.error('请填写联系人姓名')
      return
    }
    const input: UpdateContactInput = {
      name: editContactName.trim(),
      phone: editContactPhone.trim(),
      position: editContactPosition.trim(),
      description: editContactDesc.trim() || undefined,
      describedBy: editingContact.description === editContactDesc.trim() ? editingContact.describedBy : undefined,
    }
    updateContact(customerId, editingContact.id, input)
    toast.success('联系人已更新')
    setEditingContact(null)
  }

  const handleDeleteContact = (contact: Contact) => {
    if (!window.confirm(`确定要删除联系人「${contact.name}」吗？此操作不可撤销。`)) return
    deleteContact(customerId, contact.id)
    toast.success('联系人已删除')
    if (editingContact?.id === contact.id) setEditingContact(null)
    if (describingContactId === contact.id) setDescribingContactId(null)
  }

  const handleAddDescription = (contactId: string) => {
    if (!newDescription.trim()) {
      toast.error('请填写描述内容')
      return
    }
    const contact = contacts.find(c => c.id === contactId)
    if (!contact) return
    updateContact(customerId, contactId, {
      name: contact.name,
      phone: contact.phone,
      position: contact.position,
      description: newDescription.trim(),
      describedBy: user?.name || '当前用户',
    })
    toast.success('描述已添加')
    setDescribingContactId(null)
    setNewDescription('')
  }

  return (
    <>
      <GlassPanel
        title={`联系人 (${contacts.length})`}
        action={
          <div className="flex items-center gap-1">
            {canEdit && (
              <button onClick={() => setShowAdd(true)} className="nav-icon" title="添加联系人">
                <Plus size={14} />
              </button>
            )}
            <button onClick={() => setExpanded(!expanded)} className="nav-icon">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        }
      >
        {expanded && (
          contacts.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">暂无联系人</p>
          ) : (
            <div className="space-y-2">
              {contacts.map(contact => (
                <div key={contact.id} className="p-3 rounded-lg bg-white/40 border border-black/[0.03]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">{contact.name}</span>
                    <div className="flex items-center gap-0.5">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 mr-1">
                        <Briefcase size={10} />{contact.position}
                      </span>
                      {canEdit && (
                        <>
                          <button
                            onClick={() => { setDescribingContactId(describingContactId === contact.id ? null : contact.id); setNewDescription('') }}
                            className="p-1 rounded hover:bg-green-50 text-slate-400 hover:text-green-500 interactive"
                            title="添加描述"
                          >
                            <MessageSquare size={12} />
                          </button>
                          <button
                            onClick={() => openEditModal(contact)}
                            className="p-1 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-500 interactive"
                            title="编辑联系人"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteContact(contact)}
                            className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 interactive"
                            title="删除联系人"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1"><Phone size={10} />{contact.phone}</span>
                  </div>
                  {contact.description && (
                    <p className="text-[10px] text-slate-400 mt-1.5 border-t border-black/[0.03] pt-1.5">
                      {contact.description}
                      {contact.describedBy && <span className="text-slate-300 ml-1">— {contact.describedBy}</span>}
                    </p>
                  )}
                  {describingContactId === contact.id && (
                    <div className="mt-2 border-t border-black/[0.03] pt-2">
                      <textarea
                        className="input-glass w-full h-16 resize-none text-[10px]"
                        placeholder="添加描述…"
                        value={newDescription}
                        onChange={e => setNewDescription(e.target.value)}
                      />
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[9px] text-slate-400">描述人：{user?.name || '当前用户'}</span>
                        <button
                          onClick={() => handleAddDescription(contact.id)}
                          className="text-[10px] text-green-500 font-medium interactive px-2 py-1 rounded bg-green-50/50"
                        >
                          保存描述
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </GlassPanel>

      <GlassModal open={editingContact !== null} onClose={() => setEditingContact(null)} title="编辑联系人">
        {editingContact && (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-slate-500 font-semibold block mb-1">姓名 *</label>
              <input
                className="input-glass w-full text-xs"
                placeholder="联系人姓名"
                value={editContactName}
                onChange={e => setEditContactName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-semibold block mb-1">电话</label>
              <input
                className="input-glass w-full text-xs"
                placeholder="联系电话"
                value={editContactPhone}
                onChange={e => setEditContactPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-semibold block mb-1">职位</label>
              <input
                className="input-glass w-full text-xs"
                placeholder="职位"
                value={editContactPosition}
                onChange={e => setEditContactPosition(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-semibold block mb-1">描述</label>
              <textarea
                className="input-glass w-full h-20 resize-none text-xs"
                placeholder="联系人描述"
                value={editContactDesc}
                onChange={e => setEditContactDesc(e.target.value)}
              />
            </div>
            <button
              onClick={handleUpdateContact}
              className="w-full py-2 bg-blue-500 text-white text-xs font-semibold rounded-lg interactive"
            >
              保存修改
            </button>
          </div>
        )}
      </GlassModal>

      <GlassModal open={showAdd} onClose={() => { setShowAdd(false); resetForm() }} title="添加联系人">
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-slate-500 font-semibold block mb-1">姓名 *</label>
            <input
              className="input-glass w-full text-xs"
              placeholder="联系人姓名"
              value={contactName}
              onChange={e => setContactName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-semibold block mb-1">电话</label>
            <input
              className="input-glass w-full text-xs"
              placeholder="联系电话"
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-semibold block mb-1">职位</label>
            <input
              className="input-glass w-full text-xs"
              placeholder="职位"
              value={contactPosition}
              onChange={e => setContactPosition(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-semibold block mb-1">描述</label>
            <textarea
              className="input-glass w-full h-20 resize-none text-xs"
              placeholder="联系人描述"
              value={contactDesc}
              onChange={e => setContactDesc(e.target.value)}
            />
          </div>
          <button
            onClick={handleSave}
            className="w-full py-2 bg-blue-500 text-white text-xs font-semibold rounded-lg interactive"
          >
            保存
          </button>
        </div>
      </GlassModal>
    </>
  )
}
