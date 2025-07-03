-- Migration 010: Create Document Management System
-- This migration creates the document management system with types, documents, and approval workflow

-- Create document_types table
CREATE TABLE IF NOT EXISTS document_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_certification BOOLEAN DEFAULT false,
    requires_expiration BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type_id UUID NOT NULL REFERENCES document_types(id),
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'expired')),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    expiration_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert predefined document types
INSERT INTO document_types (name, description, is_certification, requires_expiration) VALUES
('Forklift Certification', 'Forklift operator certification document', true, true),
('OSHA Certification', 'OSHA safety compliance certification', true, true),
('Driver''s License Photo', 'Photo of driver''s license for identification', false, true),
('Paper Time Sheet', 'Physical time sheet documentation', false, false),
('General Document', 'General purpose document upload', false, false)
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_document_type_id ON documents(document_type_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_documents_expiration_date ON documents(expiration_date);
CREATE INDEX IF NOT EXISTS idx_documents_reviewed_by ON documents(reviewed_by);

-- Create indexes for document_types
CREATE INDEX IF NOT EXISTS idx_document_types_name ON document_types(name);
CREATE INDEX IF NOT EXISTS idx_document_types_is_certification ON document_types(is_certification);

-- Add comments for documentation
COMMENT ON TABLE document_types IS 'Predefined types of documents that can be uploaded';
COMMENT ON TABLE documents IS 'User uploaded documents with approval workflow';
COMMENT ON COLUMN documents.status IS 'Document approval status: pending_review, approved, rejected, expired';
COMMENT ON COLUMN documents.file_path IS 'Relative path to the uploaded file in the storage system';
COMMENT ON COLUMN documents.expiration_date IS 'Expiration date for certifications and time-sensitive documents';

-- Create a view for document statistics
CREATE OR REPLACE VIEW document_stats AS
SELECT 
    dt.name as document_type,
    COUNT(d.id) as total_documents,
    COUNT(CASE WHEN d.status = 'pending_review' THEN 1 END) as pending_count,
    COUNT(CASE WHEN d.status = 'approved' THEN 1 END) as approved_count,
    COUNT(CASE WHEN d.status = 'rejected' THEN 1 END) as rejected_count,
    COUNT(CASE WHEN d.status = 'expired' THEN 1 END) as expired_count
FROM document_types dt
LEFT JOIN documents d ON dt.id = d.document_type_id
GROUP BY dt.id, dt.name
ORDER BY dt.name;

-- Create a view for pending documents that need review
CREATE OR REPLACE VIEW pending_documents_review AS
SELECT 
    d.id,
    d.original_filename,
    d.file_path,
    d.file_size,
    d.mime_type,
    d.uploaded_at,
    d.expiration_date,
    u.name as user_name,
    u.email as user_email,
    dt.name as document_type,
    dt.is_certification,
    dt.requires_expiration
FROM documents d
JOIN users u ON d.user_id = u.id
JOIN document_types dt ON d.document_type_id = dt.id
WHERE d.status = 'pending_review'
ORDER BY d.uploaded_at ASC;
