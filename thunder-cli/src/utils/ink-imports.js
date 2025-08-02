// Wrapper for CommonJS modules
import selectInputModule from 'ink-select-input';
import textInputModule from 'ink-text-input';
import spinnerModule from 'ink-spinner';
import gradientModule from 'ink-gradient';
import bigTextModule from 'ink-big-text';
import tableModule from 'ink-table';

// Handle different export patterns
export const SelectInput = selectInputModule.default || selectInputModule;
export const TextInput = textInputModule.default || textInputModule;
export const Spinner = spinnerModule.default || spinnerModule;
export const Gradient = gradientModule.default || gradientModule;
export const BigText = bigTextModule.default || bigTextModule;
export const Table = tableModule.default || tableModule;