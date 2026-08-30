import { AccessGate } from './access/AccessGate';
import { MergerApp } from './MergerApp';

export default function App() {
  return (
    <AccessGate>
      <MergerApp />
    </AccessGate>
  );
}
