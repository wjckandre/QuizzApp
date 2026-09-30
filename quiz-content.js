export const slides = {
  'Presentation': [
    { title: 'Presentation', image: '/slides/presentation.png' },
  ],
  'Échauffement': [
    { title: "En quelle année l’équipe Stan Robotix a-t-elle été créée ?", answer: '2016 (1 pt)' },
    { title: 'Bonus : quelle est la date exacte ?', answer: '7 novembre 2016 (1 pt)' },
    { title: 'Qui sont les capitaines de la première année ?', answer: 'Derek et Mikael (1 pt)' },
    { title: 'Qui est le capitaine de la première année ?', answer: 'Derek et Mikael (1 pt)' },
    { title: 'Qui sont les capitaines cette année ?', answer: 'Timothée et Alban (1 pt)' },
    { title: 'Quel est le numéro et le nom de l’équipe québécoise possédant les mêmes chiffres que Stan Robotix ?', answer: '2626 Évolution (1 + 1 pt)' },
    { title: 'Au cours d’un match, combien de fois ce son est-il audible ?', answer: 'Deux fois : à la fin de la période autonome et à la fin du match (1 pt)' },
    { title: 'Imiter le son du début d’un match.', answer: 'Tututu-tutu (1 pt)' },
    { title: 'Quel mentor n’a (honteusement) jamais acheté de tasse Stan Robotix ?', answer: 'Raphaël (1 pt)' },
    { title: 'En quelles années le festival de robotique régional ne s’est pas tenu à Montréal ?', answer: '2019 à Québec et 2023 à Trois-Rivières (1 pt, villes acceptées)' },
    { title: 'Comment s’appelle cette danse ?', answer: 'La danse du robot (1 pt)' },
    { title: 'Sur les 13 compétitions auxquelles Stan Robotix a participé, Betabot et FRC confondues, combien ont été gagnées ?', answer: '2 (1 pt)' },
  ],
  'L atelier': [
    { title: "L'atelier, ma deuxième maison" },
    { title: 'Quel est le code du cadenas de l’armoire de la M109 ?', answer: '13-3-21' },
    { title: 'De quelle franchise provient ce jouet ?', answer: 'Kinder Surprise', image: '/atelier/poney.png' },
  ],
  'Lore très obscur': [
    { title: 'Lore très (très) obscur', image: '/slides/stonksandre.png' },
  ],
  'Contexte': [
    { title: '« Contexte ? »', image: '/slides/visibleconfusionmax.jpg' },
  ],
  'Trucs aléatoires': [
    { title: 'Trucs aléatoires', image: '/slides/whenréu.png' },
  ],
}

export const categories = Object.keys(slides).filter((category) => slides[category].length > 0)
export const defaultCategory = categories[0]