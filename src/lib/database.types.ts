// ============================================================================
// Creegator database types.
// ----------------------------------------------------------------------------
// Hand-authored to match supabase/migrations/20260626000000_init_schema.sql so
// the app is typed before a DB exists. Once a Supabase project is linked (or
// running locally with Docker), regenerate the authoritative version with:
//
//   npm run gen:types        # --linked
//   npm run gen:types:local  # --local (needs Docker)
//
// Keep this file and the migration in lockstep until generation takes over.
// ============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// --- Enums ------------------------------------------------------------------
export type Platform = 'instagram' | 'tiktok' | 'youtube' | 'other';
export type TeamRole = 'owner' | 'member';
export type SourceType = 'discovery_query' | 'hashtag' | 'serp' | 'inbound' | 'manual';
export type CreatorStatus =
  | 'new' | 'enriched' | 'qualified' | 'active' | 'archived' | 'do_not_contact';
export type PipelineStage =
  | 'new' | 'contacted' | 'replied' | 'negotiating' | 'contracted' | 'live' | 'paid';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'archived';
export type PricingModel =
  | 'flat_per_deliverable' | 'deliverable_plus_usage' | 'bundle' | 'performance' | 'hybrid';
export type ContractStatus = 'draft' | 'sent' | 'signed' | 'declined' | 'void';
export type EmailStatus = 'unverified' | 'valid' | 'invalid' | 'risky' | 'unknown';
export type MessageDirection = 'outbound' | 'inbound';
export type MessageStatus =
  | 'draft' | 'queued' | 'scheduled' | 'sent' | 'opened' | 'replied' | 'bounced' | 'failed';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';
export type AssetType = 'image' | 'video' | 'document' | 'link';
export type DocumentKind = 'non_negotiable_terms' | 'rules' | 'other';

// Creator lifecycle in display order.
export const CREATOR_STATUSES: CreatorStatus[] = [
  'new', 'enriched', 'qualified', 'active', 'archived', 'do_not_contact',
];

// Pipeline stages in display order (§7.6).
export const PIPELINE_STAGES: PipelineStage[] = [
  'new', 'contacted', 'replied', 'negotiating', 'contracted', 'live', 'paid',
];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          role: TeamRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          role?: TeamRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      sources: {
        Row: {
          id: string;
          type: SourceType;
          label: string;
          platform: Platform | null;
          query: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: SourceType;
          label: string;
          platform?: Platform | null;
          query?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['sources']['Insert']>;
      };
      creators: {
        Row: {
          id: string;
          dedupe_key: string;
          display_name: string | null;
          handle: string | null;
          primary_platform: Platform;
          handles: Json;
          niche: string | null;
          bio: string | null;
          email: string | null;
          email_status: EmailStatus;
          link_in_bio: string | null;
          rate_card: Json | null;
          follower_count: number | null;
          engagement_rate: number | null;
          fit_score: number | null;
          fit_notes: string | null;
          status: CreatorStatus;
          tags: string[];
          enrichment: Json;
          raw: Json;
          source_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          dedupe_key: string;
          display_name?: string | null;
          handle?: string | null;
          primary_platform?: Platform;
          handles?: Json;
          niche?: string | null;
          bio?: string | null;
          email?: string | null;
          email_status?: EmailStatus;
          link_in_bio?: string | null;
          rate_card?: Json | null;
          follower_count?: number | null;
          engagement_rate?: number | null;
          fit_score?: number | null;
          fit_notes?: string | null;
          status?: CreatorStatus;
          tags?: string[];
          enrichment?: Json;
          raw?: Json;
          source_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['creators']['Insert']>;
      };
      campaigns: {
        Row: {
          id: string;
          name: string;
          brand: string | null;
          status: CampaignStatus;
          description: string | null;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          brand?: string | null;
          status?: CampaignStatus;
          description?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['campaigns']['Insert']>;
      };
      campaign_creators: {
        Row: {
          id: string;
          campaign_id: string;
          creator_id: string;
          stage: PipelineStage;
          priority: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          creator_id: string;
          stage?: PipelineStage;
          priority?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['campaign_creators']['Insert']>;
      };
      briefs: {
        Row: {
          id: string;
          name: string;
          is_template: boolean;
          body: string | null;
          rules: string | null;
          campaign_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          is_template?: boolean;
          body?: string | null;
          rules?: string | null;
          campaign_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['briefs']['Insert']>;
      };
      scripts: {
        Row: {
          id: string;
          title: string;
          is_template: boolean;
          body: string | null;
          generated_by_ai: boolean;
          brief_id: string | null;
          campaign_id: string | null;
          creator_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          is_template?: boolean;
          body?: string | null;
          generated_by_ai?: boolean;
          brief_id?: string | null;
          campaign_id?: string | null;
          creator_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['scripts']['Insert']>;
      };
      assets: {
        Row: {
          id: string;
          name: string;
          type: AssetType;
          url: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type?: AssetType;
          url: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['assets']['Insert']>;
      };
      script_assets: {
        Row: { script_id: string; asset_id: string };
        Insert: { script_id: string; asset_id: string };
        Update: Partial<{ script_id: string; asset_id: string }>;
      };
      documents: {
        Row: {
          id: string;
          name: string;
          kind: DocumentKind;
          body: string;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          kind?: DocumentKind;
          body: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['documents']['Insert']>;
      };
      contract_templates: {
        Row: {
          id: string;
          name: string;
          body: string;
          default_pricing_model: PricingModel;
          default_pricing: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          body: string;
          default_pricing_model?: PricingModel;
          default_pricing?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['contract_templates']['Insert']>;
      };
      contracts: {
        Row: {
          id: string;
          campaign_creator_id: string;
          template_id: string | null;
          pricing_model: PricingModel;
          pricing: Json;
          variables: Json;
          generated_body: string | null;
          status: ContractStatus;
          sent_at: string | null;
          signed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_creator_id: string;
          template_id?: string | null;
          pricing_model?: PricingModel;
          pricing?: Json;
          variables?: Json;
          generated_body?: string | null;
          status?: ContractStatus;
          sent_at?: string | null;
          signed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['contracts']['Insert']>;
      };
      messages: {
        Row: {
          id: string;
          campaign_creator_id: string;
          direction: MessageDirection;
          status: MessageStatus;
          subject: string | null;
          body: string | null;
          ai_opener: string | null;
          from_address: string | null;
          to_address: string | null;
          headers: Json;
          attachments: Json;
          contract_id: string | null;
          provider_message_id: string | null;
          scheduled_at: string | null;
          sent_at: string | null;
          opened_at: string | null;
          replied_at: string | null;
          bounced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_creator_id: string;
          direction: MessageDirection;
          status?: MessageStatus;
          subject?: string | null;
          body?: string | null;
          ai_opener?: string | null;
          from_address?: string | null;
          to_address?: string | null;
          headers?: Json;
          attachments?: Json;
          contract_id?: string | null;
          provider_message_id?: string | null;
          scheduled_at?: string | null;
          sent_at?: string | null;
          opened_at?: string | null;
          replied_at?: string | null;
          bounced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
      };
      deliverables: {
        Row: {
          id: string;
          campaign_creator_id: string;
          content_url: string | null;
          platform: Platform | null;
          posted_at: string | null;
          views: number | null;
          likes: number | null;
          comments: number | null;
          shares: number | null;
          metrics_synced_at: string | null;
          metrics: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_creator_id: string;
          content_url?: string | null;
          platform?: Platform | null;
          posted_at?: string | null;
          views?: number | null;
          likes?: number | null;
          comments?: number | null;
          shares?: number | null;
          metrics_synced_at?: string | null;
          metrics?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['deliverables']['Insert']>;
      };
      payments: {
        Row: {
          id: string;
          campaign_creator_id: string;
          contract_id: string | null;
          amount_cents: number;
          fee_cents: number;
          currency: string;
          status: PaymentStatus;
          stripe_payment_intent_id: string | null;
          stripe_transfer_id: string | null;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_creator_id: string;
          contract_id?: string | null;
          amount_cents: number;
          fee_cents?: number;
          currency?: string;
          status?: PaymentStatus;
          stripe_payment_intent_id?: string | null;
          stripe_transfer_id?: string | null;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['payments']['Insert']>;
      };
      waitlist_signups: {
        Row: {
          id: string;
          email: string;
          handle: string | null;
          platform: Platform | null;
          niche: string | null;
          message: string | null;
          converted_creator_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          handle?: string | null;
          platform?: Platform | null;
          niche?: string | null;
          message?: string | null;
          converted_creator_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['waitlist_signups']['Insert']>;
      };
    };
    Views: Record<never, never>;
    Functions: {
      is_team_member: { Args: Record<never, never>; Returns: boolean };
    };
    Enums: {
      platform: Platform;
      team_role: TeamRole;
      source_type: SourceType;
      creator_status: CreatorStatus;
      pipeline_stage: PipelineStage;
      campaign_status: CampaignStatus;
      pricing_model: PricingModel;
      contract_status: ContractStatus;
      email_status: EmailStatus;
      message_direction: MessageDirection;
      message_status: MessageStatus;
      payment_status: PaymentStatus;
      asset_type: AssetType;
      document_kind: DocumentKind;
    };
  };
};

// Convenience row aliases.
export type Creator = Database['public']['Tables']['creators']['Row'];
export type Source = Database['public']['Tables']['sources']['Row'];
export type Campaign = Database['public']['Tables']['campaigns']['Row'];
export type CampaignCreator = Database['public']['Tables']['campaign_creators']['Row'];
export type Brief = Database['public']['Tables']['briefs']['Row'];
export type Script = Database['public']['Tables']['scripts']['Row'];
export type Contract = Database['public']['Tables']['contracts']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type Deliverable = Database['public']['Tables']['deliverables']['Row'];
export type Payment = Database['public']['Tables']['payments']['Row'];
export type WaitlistSignup = Database['public']['Tables']['waitlist_signups']['Row'];
