// Возврат в тур с экранов процесса, кейса и дашборда: маршрут продолжается с того же шага,
// а если передана локация — тур открывает её (и точку, если она указана).
import { useNavigate } from 'react-router-dom'
import { useTourStore } from '../../3d'

export function useBackToTour() {
  const navigate = useNavigate()
  const route = useTourStore((s) => s.route)
  const goToLocation = useTourStore((s) => s.goToLocation)
  return (locationId, hotspotId = null) => {
    if (locationId) goToLocation(locationId, hotspotId)
    navigate(route ? `/tour/${route.id}` : '/tour')
  }
}
