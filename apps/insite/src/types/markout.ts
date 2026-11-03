export type PhotoInfo = {
  uri: string;
  mimeType: string;
};

export type ExistingPhoto = PhotoInfo & {
  id?: number;
  isNew: boolean;
  storagePath?: string;
};

export type UploadTask = PhotoInfo & {
  tag: string;
  index: number;
  storagePath: string;
  fileName: string;
};

export type AttachmentPayload = {
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  category: string;
  file_tag: string;
};

export type MarkoutDetails = {
  notes?: string;
  note?: string;
};

export type MarkoutRecord = {
  id: number;
  job_id: number;
  details: MarkoutDetails;
  submitted_by?: string;
  created_at: string;
  updated_at: string;
  idempotency_key?: string;
};
