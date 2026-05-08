function ContactGrid() {
  try {
    const contacts = [
      { name: "Gmail", icon: "icon-mail", link: "#", color: "hover:text-red-400 border-white/20" },
      { name: "Discord", icon: "icon-message-square", link: "#", color: "hover:text-indigo-400 border-white/20" },
      { name: "LinkedIn", icon: "icon-linkedin", link: "#", color: "hover:text-blue-500 border-white/20" },
      { name: "Instagram", icon: "icon-camera", link: "#", color: "hover:text-pink-500 border-white/20" }
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-name="contact-grid" data-file="components/founders/ContactGrid.js">
        {contacts.map((contact, idx) => (
          <a key={idx} href={contact.link} className={`flex flex-col items-center justify-center p-6 border-2 bg-dark/50 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 ${contact.color}`}>
            <div className={`${contact.icon} text-3xl mb-3 text-gray-300 transition-colors`}></div>
            <span className="font-mono text-sm font-bold text-gray-400 uppercase">{contact.name}</span>
          </a>
        ))}
      </div>
    );
  } catch (error) {
    console.error('ContactGrid component error:', error);
    return null;
  }
}