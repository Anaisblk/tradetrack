const colorMap = {
  green: 'bg-green-100 text-green-800',
  blue: 'bg-indigo-100 text-indigo-800',
  red: 'bg-red-100 text-red-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  orange: 'bg-orange-100 text-orange-800',
  gray: 'bg-gray-100 text-gray-800',
}

export default function Badge({ label, color = 'gray' }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorMap[color] || colorMap.gray}`}>
      {label}
    </span>
  )
}
