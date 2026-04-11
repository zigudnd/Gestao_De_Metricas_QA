export type Platform = 'iOS' | 'Android' | 'Front' | 'BFF' | 'Back' | 'Infra'

export const PLATFORM_ICON: Record<Platform, string> = {
  iOS: '🍎', Android: '🤖', Front: '🌐', BFF: '🔗', Back: '🖥', Infra: '☁️',
}

export const PLATFORM_COLOR: Record<Platform, string> = {
  iOS: '#555', Android: '#3dba4e', Front: '#3b82f6', BFF: '#8b5cf6', Back: '#2C2C2A', Infra: '#06b6d4',
}

export const ALL_PLATFORMS: Platform[] = ['iOS', 'Android', 'Front', 'BFF', 'Back', 'Infra']
