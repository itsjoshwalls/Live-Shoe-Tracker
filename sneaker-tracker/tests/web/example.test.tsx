import { render, screen } from '@testing-library/react';
import ExampleComponent from '../components/ExampleComponent'; // Adjust the import based on your actual component path

describe('ExampleComponent', () => {
  test('renders the component with correct text', () => {
    render(<ExampleComponent />);
    const linkElement = screen.getByText(/example text/i); // Replace with actual text to check
    expect(linkElement).toBeInTheDocument();
  });

  test('has a button that triggers an action', () => {
    render(<ExampleComponent />);
    const buttonElement = screen.getByRole('button', { name: /click me/i }); // Replace with actual button text
    buttonElement.click();
    // Add assertions to verify the action triggered by the button
  });
});