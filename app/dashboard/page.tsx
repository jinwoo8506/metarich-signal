// app/agent/page.tsx (예시)
export default function Page() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeMenu, setActiveMenu] = useState('dashboard');

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <Sidebar 
        user={user} 
        selectedDate={selectedDate} 
        onDateChange={setSelectedDate} 
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
      />
      <AgentView 
        user={user} 
        selectedDate={selectedDate} 
        activeMenu={activeMenu} 
      />
    </div>
  )
}