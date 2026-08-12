import { AppProviders } from "./providers/AppProviders";
import { PlayerGate } from "./PlayerGate";
import { HomeScreen } from "../screens/HomeScreen";

export default function App() {
  return (
    <AppProviders>
      <PlayerGate>
        <HomeScreen/>
      </PlayerGate>
    </AppProviders>
  );
}
