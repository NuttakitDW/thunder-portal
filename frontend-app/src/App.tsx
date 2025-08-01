import { Button } from "@/components/ui/button"
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { WalletInfo } from './components/WalletInfo';

function App() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-3xl font-bold">Thunder Portal</h1>
      <ConnectButton />
      <WalletInfo />
      <Button>Click me</Button>
    </div>
  )
}

export default App
