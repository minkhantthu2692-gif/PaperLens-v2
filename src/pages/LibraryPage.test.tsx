import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import type { DocumentRecord } from '@/domain/document';
import { deleteDocument, listDocuments } from '@/services/storage/documents';
import LibraryPage from './LibraryPage';

vi.mock('@/services/storage/documents', () => ({
  listDocuments: vi.fn(),
  renameDocument: vi.fn(),
  deleteDocument: vi.fn(),
}));
const listDocumentsMock = vi.mocked(listDocuments);
const deleteDocumentMock = vi.mocked(deleteDocument);

function createRecord(id: string, title: string): DocumentRecord {
  return {
    id,
    title,
    createdAt: 0,
    updatedAt: 0,
    schemaVersion: 2,
    source: {
      assetId: `asset-${id}`,
      kind: 'image',
      mimeType: 'image/png',
      fileName: 'scan.png',
      size: 10,
    },
    editor: { html: '<p>Hello</p>', text: 'Hello', json: null },
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <LibraryPage />
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  listDocumentsMock.mockReset();
  deleteDocumentMock.mockReset();
  // jsdom implements <dialog> without the modal methods; the Dialog component
  // falls back for showModal but still relies on close().
  if (typeof HTMLDialogElement.prototype.close !== 'function') {
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
  }
  if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
  }
  await i18n.changeLanguage('en');
});

describe('Library page import entry points', () => {
  it('shows only the centered import action when no documents exist', async () => {
    listDocumentsMock.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('Start with your first document')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Import document' })).toHaveLength(1);
  });

  it('shows only the top-bar import action when documents exist', async () => {
    listDocumentsMock.mockResolvedValue([createRecord('doc-1', 'Quarterly report')]);
    renderPage();

    await waitFor(() => expect(screen.getByText('Quarterly report')).toBeInTheDocument());

    // The import button lives in the page header, not in the empty state.
    const topBar = screen.getByRole('heading', { level: 1, name: 'Documents' }).closest('header');
    expect(topBar).not.toBeNull();
    expect(
      within(topBar as HTMLElement).getByRole('button', { name: 'Import document' }),
    ).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Import document' })).toHaveLength(1);

    // The empty state and its drop zone stay hidden once documents exist.
    expect(screen.queryByText('Start with your first document')).toBeNull();
    expect(screen.queryByText('Drop a file here')).toBeNull();
  });

  it('returns to the centered import state after deleting the final document', async () => {
    const user = userEvent.setup();
    listDocumentsMock
      .mockResolvedValueOnce([createRecord('doc-1', 'Only document')])
      .mockResolvedValueOnce([]);
    renderPage();

    await waitFor(() => expect(screen.getByText('Only document')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Delete: Only document' }));
    // The confirmation dialog's own Delete button is distinct from the card
    // action, whose accessible name is prefixed with the document title.
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(deleteDocumentMock).toHaveBeenCalledWith('doc-1');

    expect(await screen.findByText('Start with your first document')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Import document' })).toHaveLength(1);
    expect(screen.queryByText('Only document')).toBeNull();
  });
});
