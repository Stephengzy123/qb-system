import type { BankFolder, BankSet, SetQuestion } from '../../src/lib/question-bank-model';
export const folders: BankFolder[] = [
  { id: 'root', parent_folder_id: null, name: 'Biology', can_upload: true, path: 'Biology' },
  { id: 'year', parent_folder_id: 'root', name: 'Year 1', can_upload: true, path: 'Biology / Year 1' },
  { id: 'chapter', parent_folder_id: 'year', name: 'Chapter 3', can_upload: true, path: 'Biology / Year 1 / Chapter 3' },
  { id: 'empty', parent_folder_id: 'root', name: 'Empty folder', can_upload: false, path: 'Biology / Empty folder' },
];
export const sets: BankSet[] = [{ id: 'practice', folder_id: 'chapter', name: 'Practice set', path: 'Biology / Year 1 / Chapter 3', status: 'draft', count: 2, answered: 1, import_id: null }];
export const questions: SetQuestion[] = [
  { id: 'q1', version_id: 'v1', position: 0, name: 'Question1.png', asset_id: 'image1', correct_choice_id: null, choices: [{ id: 'a1', label: 'A' }, { id: 'b1', label: 'B' }] },
  { id: 'q2', version_id: 'v2', position: 1, name: 'Question2.png', asset_id: 'image2', correct_choice_id: 'a2', choices: [{ id: 'a2', label: 'A' }, { id: 'b2', label: 'B' }] },
];
