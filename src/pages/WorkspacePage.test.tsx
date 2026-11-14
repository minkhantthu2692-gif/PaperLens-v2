import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { FocusModeProvider } from '@/components/layout/FocusModeProvider';
import type { DocumentRecord, SourceAsset } from '@/domain/document';
import { getDocument, getSourceAsset } from '@/services/storage/documents';
import WorkspacePage from './WorkspacePage';

vi.mock('@/features/workspace/SourcePanel', () => ({
  SourcePanel: () => <div>source panel</div>,
}));

vi.mock('@/features/workspace/EditorPanel', () => ({
  EditorPanel: ({
    headerActions,
    panelTitle,
  }: {
    headerActions?: ReactNode;
    panelTitle?: ReactNode;
  }) => (
    <div>
      {panelTitle}
      {headerActions}
    </div>
  ),
}));

vi.mock('@/features/ai/AiAssistantDialog', () => ({ AiAssistantDialog: () => null }));
vi.mock('@/features/image/ImageRefineDialog', () => ({ ImageRefineDialog: () => null }));
vi.mock('@/features/translator/TranslatorDialog', () => ({ TranslatorDialog: () => null }));
vi.mock('@/features/editor/CleanupDialog', () => ({ CleanupDialog: () => null }));
vi.mock('@/features/ocr/OcrDialog', () => ({ OcrDialog: () => null }));
vi.mock('@/services/export/exportDocument', () => ({
  exportDocx: vi.fn(),
  exportHtml: vi.fn(),
  exportPlainText: vi.fn(),
  printDocument: vi.fn(),
}));

vi.mock('@/services/storage/documents', () => ({
  getDocument: vi.fn(),
  getSourceAsset: vi.fn(),
  renameDocument: vi.fn(),
  saveRefinedImage: vi.fn(),
  clearRefinedImage: vi.fn(),
  updateDocumentSourcePageCount: vi.fn(),
}));

const getDocumentMock = vi.mocked(getDocument);
const getSourceAssetMock = vi.mocked(getSourceAsset);

const record: DocumentRecord = {
  id: 'doc-1',
  title: 'Sample document',
  createdAt: 0,
  updatedAt: 0,
  schemaVersion: 2,
  source: {
    assetId: 'asset-1',
    kind: 'image',
    mimeType: 'image/png',
    fileName: 'scan.png',
    size: 10,
  },
  editor: { html: '<p>Hello</p>', text: 'Hello', json: null },
};

const asset: SourceAsset = {
  id: 'asset-1',
  blob: new Blob(['image'], { type: 'image/png' }),
  mimeType: 'image/png',
  fileName: 'scan.png',
  size: 5,
  createdAt: 0,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/workspace/doc-1']}>
      <Routes>
        <Route
          path="/workspace/:documentId"
          element={
            <FocusModeProvider>
              <WorkspacePage />
            </FocusModeProvider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  getDocumentMock.mockReset();
  getSourceAssetMock.mockReset();
  getDocumentMock.mockResolvedValue(record);
  getSourceAssetMock.mockResolvedValue(asset);
});

describe('Workspace Focus control', () => {
  it('stays visible when the global Full Workspace default is disabled', async () => {
    renderPage();

    expect(
      await screen.findByRole('button', { name: 'Enter Full Workspace Mode' }),
    ).toBeInTheDocument();
  });

  it('stays visible when the global Full Workspace default is enabled', async () => {
    localStorage.setItem('paperlens.full-workspace.enabled', 'true');
    renderPage();

    expect(await screen.findByRole('button', { name: 'Exit Full Workspace' })).toBeInTheDocument();
  });
});
