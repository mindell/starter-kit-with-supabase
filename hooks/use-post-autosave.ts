import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import debounce from 'lodash/debounce'

export interface PostDraft {
  id?: string
  post_id?: string
  title: string
  content: string
  excerpt?: string
  featured_image?: string
  seo_title?: string
  seo_description?: string
  seo_keywords?: string[]
  canonical_url?: string
  structured_data?: any
  is_indexable?: boolean
  is_valid?: boolean
  validation_errors?: any[]
  scheduled_at?: string
  status?: "draft" | "scheduled" | "published" | "archived"
}

interface AutoSaveStatus {
  lastSaved: Date | null
  saving: boolean
  error: string | null
}

export function usePostAutosave(initialData?: Partial<PostDraft>) {
  const supabase = createClient()
  const [draft, setDraft] = useState<PostDraft>({
    title: '',
    content: '',
    status: 'draft',
    ...initialData,
  })
  const [status, setStatus] = useState<AutoSaveStatus>({
    lastSaved: null,
    saving: false,
    error: null,
  })
  const draftRef = useRef<string | null>(null)

  // Load draft from localStorage on mount
  useEffect(() => {
    if (!initialData?.post_id) {
      const savedDraftId = localStorage.getItem('post_draft_id')
      if (savedDraftId) {
        loadDraft(savedDraftId)
      }
    }
  }, [])

  const loadDraft = async (draftId: string) => {
    try {
      const { data, error } = await supabase
        .from('post_drafts')
        .select('*')
        .eq('id', draftId)
        .single()

      if (error) throw error
      if (data) {
        setDraft(data)
        draftRef.current = draftId
      }
    } catch (error) {
      console.error('Error loading draft:', error)
    }
  }

  const saveDraft = useCallback(
    debounce(async (draftData: PostDraft) => {
      try {
        setStatus(prev => ({ ...prev, saving: true }))

        // Clean up data before saving
        const cleanedData = {
          ...draftData,
          // Set scheduled_at to undefined if status is not 'scheduled' or if it's empty
          scheduled_at: draftData.status === 'scheduled' && draftData.scheduled_at ? draftData.scheduled_at : undefined,
          // Ensure all nullable fields are undefined instead of empty strings
          excerpt: draftData.excerpt || undefined,
          seo_title: draftData.seo_title || undefined,
          seo_description: draftData.seo_description || undefined,
          seo_keywords: draftData.seo_keywords || undefined,
          canonical_url: draftData.canonical_url || undefined,
          featured_image: draftData.featured_image || undefined,
        }

        // Validate draft
        const { data: validationData } = await supabase.rpc(
          'fn_validate_post_draft',
          {
            p_title: cleanedData.title,
            p_excerpt: cleanedData.excerpt,
            p_seo_title: cleanedData.seo_title,
            p_seo_description: cleanedData.seo_description,
          }
        )

        const isValid = Array.isArray(validationData) && validationData.length === 0

        if (draftRef.current) {
          // Update existing draft
          const { error } = await supabase
            .from('post_drafts')
            .update({
              ...cleanedData,
              is_valid: isValid,
              validation_errors: validationData,
              last_saved_at: new Date().toISOString(),
            })
            .eq('id', draftRef.current)

          if (error) throw error
        } else {
          // Create new draft
          const { data, error } = await supabase
            .from('post_drafts')
            .insert({
              ...cleanedData,
              is_valid: isValid,
              validation_errors: validationData,
            })
            .select()
            .single()

          if (error) throw error
          if (data) {
            draftRef.current = data.id
            if (!cleanedData.post_id) {
              localStorage.setItem('post_draft_id', data.id)
            }
          }
        }

        setStatus({
          lastSaved: new Date(),
          saving: false,
          error: null,
        })
      } catch (error: any) {
        setStatus({
          lastSaved: null,
          saving: false,
          error: error.message,
        })
      }
    }, 3000),
    [supabase]
  )

  const updateDraft = useCallback(
    (updates: Partial<PostDraft>) => {
      const newDraft = { ...draft, ...updates }
      setDraft(newDraft)
      saveDraft(newDraft)
    },
    [draft, saveDraft]
  )

  const discardDraft = useCallback(async () => {
    if (draftRef.current) {
      try {
        await supabase.from('post_drafts').delete().eq('id', draftRef.current)
        localStorage.removeItem('post_draft_id')
        draftRef.current = null
        setDraft({
          title: '',
          content: '',
        })
        setStatus({
          lastSaved: null,
          saving: false,
          error: null,
        })
      } catch (error: any) {
        console.error('Error discarding draft:', error)
      }
    }
  }, [supabase])

  return {
    draft,
    updateDraft,
    discardDraft,
    status,
  }
}
