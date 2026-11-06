export interface PublicComment { id: string; body: string; created_at: string }
export interface OwnComment extends PublicComment { project_id?: string; is_published?: boolean; status: 'pending' | 'approved' | 'rejected'; review_note: string | null; updated_at: string }
export interface ReviewComment extends OwnComment { project_id: string; project_title: string }
export interface PublicFeedback { encouragement_count: number; comments: PublicComment[] }
export interface OwnFeedback { encouraged: boolean; comments: OwnComment[] }
