export function getNotificationDestination(notification) {
  const destination = String(notification?.linkTo || '').trim();
  if (!destination.startsWith('/') || destination.startsWith('//') || destination.includes('\\')) return '';
  return destination === '/notifications' ? '' : destination;
}
