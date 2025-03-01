// server/fasching/voteData.ts

export interface Nominee {
    id: string;
    name: string;
  }
  
  export interface VoteCategory {
    id: string;
    title: string;
    description?: string;
    image: string;
    nominees: Nominee[];
  }
  
  // Your categories & nominees:
  export const VOTE_CATEGORIES: VoteCategory[] = [
    {
      id: "lion_kaiser",
      title: "Löwe - Kaiser (Кайзер)",
      image: "/king.jpg",
      nominees: [
        { id: "momchil", name: "Момчил" },
        { id: "trayan", name: "Траян" },
        { id: "gogo", name: "Гого" },
        { id: "sasho", name: "Сашо" },
        { id: "nikola", name: "Никола" },
      ],
    },
    {
      id: "lioness_kaiserin",
      title: "Löwin - Kaiserin (Кайзерин)",
      image: "/queen.jpg",
      nominees: [
        { id: "viktoria", name: "Виктория" },
        { id: "radost", name: "Радост" },
        { id: "vesela", name: "Весела" },
        { id: "teodora", name: "Теодора" },
        { id: "mihaela", name: "Михаела" },
      ],
    },
    {
      id: "wizard_absolvent",
      title: "Zauberer - Absolvent (Завършващ)",
      image: "/abiturent.jpg",
      nominees: [
        { id: "getov", name: "Гетов" },
        { id: "miha-naya", name: "Миха и Ная" },
        { id: "trayan2", name: "Траян" },
        { id: "vesela2", name: "Весела" },
        { id: "momchil2", name: "Момчил" },
      ],
    },
    {
      id: "hase_8kl",
      title: "Hase - Achtklässler (Заек)",
      image: "/rabbit.jpg",
      nominees: [
        { id: "vyara", name: "Вяра" },
        { id: "valentin", name: "Валентин" },
        { id: "dimitar", name: "Димитър" },
        { id: "viktor", name: "Виктор" },
      ],
    },
    {
      id: "elefant_klug",
      title: "Elefant - Klug (Умник)",
      image: "/clever.jpg",
      nominees: [
        { id: "volen", name: "Волен" },
        { id: "danail", name: "Данаил" },
        { id: "martin", name: "Мартин" },
        { id: "mihaela2", name: "Михаела" },
        { id: "georgi", name: "Георги" },
      ],
    },
    {
      id: "clown_lustig",
      title: "Clown - Lustig (Забавен)",
      image: "/funny.jpg",
      nominees: [
        { id: "yoan", name: "Йоан" },
        { id: "emil", name: "Емил" },
        { id: "sofi", name: "Софи" },
        { id: "nikola2", name: "Никола" },
        { id: "monika", name: "Моника" },
        { id: "gogo2", name: "Гого" },
      ],
    },
    {
      id: "strongmen_sportler",
      title: "Strongmen - Sportler (Спортист)",
      image: "/sport.jpg",
      nominees: [
        { id: "boyan", name: "Боян" },
        { id: "vesela3", name: "Весела" },
        { id: "georgi2", name: "Георги" },
        { id: "darina", name: "Дарина" },
        { id: "stefi", name: "Стефи" },
      ],
    },
    {
      id: "tanzerin_modeikone",
      title: "Tänzerin - Modeikone (Модна икона)",
      image: "/modeicon.jpg",
      nominees: [
        { id: "dara", name: "Дара" },
        { id: "mark", name: "Марк" },
        { id: "kaloyan", name: "Калоян" },
        { id: "georgi3", name: "Георги" },
        { id: "gyulemetova", name: "Госпожа Гюлеметова" },
      ],
    },
    {
      id: "tanzer_verfuhrer",
      title: "Tänzer - Verführer (Сваляч)",
      image: "/boy.jpg",
      nominees: [
        { id: "martin2", name: "Мартин" },
        { id: "dimi", name: "Дими" },
        { id: "nikola3", name: "Никола" },
        { id: "naya", name: "Ная" },
        { id: "georgi4", name: "Георги" },
      ],
    },
    {
      id: "akrobatin_verfuhrerin",
      title: "Akrobatin - Verführerin (Изкусителка)",
      image: "/girl.jpg",
      nominees: [
        { id: "krisi", name: "Криси" },
        { id: "darina2", name: "Дарина" },
        { id: "alegra", name: "Алегра" },
        { id: "vyara2", name: "Вяра" },
        { id: "martin3", name: "Мартин" },
      ],
    },
    {
      id: "sanger_musiker",
      title: "Sänger - Musiker (Музикант)",
      image: "/music.jpg",
      nominees: [
        { id: "gogo3", name: "Гого" },
        { id: "yoana", name: "Йоана" },
        { id: "vladi", name: "Влади" },
        { id: "niya", name: "Ния" },
        { id: "magi", name: "Маги" },
      ],
    },
    {
      id: "feuerschlucker_schauspieler",
      title: "Feuerschlucker - Schauspieler (Артист)",
      image: "/artist.jpg",
      nominees: [
        { id: "anna", name: "Анна" },
        { id: "ivon", name: "Ивон" },
        { id: "tedi", name: "Теди" },
        { id: "pavel", name: "Павел" },
        { id: "magi2", name: "Маги" },
      ],
    },
    {
      id: "jongleur_partylowe",
      title: "Jongleur - Partylöwe (Купонджия)",
      image: "/party.jpg",
      nominees: [
        { id: "presian", name: "Пресиан" },
        { id: "kosyo", name: "Косьо" },
        { id: "ivon2", name: "Ивон" },
        { id: "momchil3", name: "Момчил" },
        { id: "ivo", name: "Иво" },
      ],
    },
    {
      id: "motorradfahrer_fluchtling",
      title: "Motorradfahrer - Flüchtling (Бягащ)",
      image: "/runner.jpg",
      nominees: [
        { id: "martin4", name: "Мартин" },
        { id: "yoana2", name: "Йоана" },
        { id: "tanya", name: "Таня" },
        { id: "dimana", name: "Димана" },
        { id: "mark2", name: "Марк" },
      ],
    },
    {
      id: "pantomime_hater",
      title: "Pantomime - Hater (Хейтър)",
      image: "/hater.jpg",
      nominees: [
        { id: "daria", name: "Дария" },
        { id: "aleksandra", name: "Александра" },
        { id: "vesela4", name: "Весела" },
        { id: "emma", name: "Емма" },
        { id: "niya2", name: "Ния" },
      ],
    },
    {
      id: "akrobaten_lieblingspaar",
      title: "Akrobaten - Lieblingspaar (Двойка)",
      image: "/couple.jpg",
      nominees: [
        { id: "momo-tedi", name: "Момо и Теди" },
        { id: "viki-ivo", name: "Вики и Иво" },
        { id: "elitsa-andrey", name: "Елица и Андрей" },
        { id: "yoni-rumen", name: "Йони и Румен" },
        { id: "yavor-silviya", name: "Явор и Силвия" },
      ],
    },
    {
      id: "tigertrainer_duo",
      title: "Tiger-Trainer - Duo (Дуо)",
      image: "/duo.jpg",
      nominees: [
        { id: "naya-miha", name: "Ная и Миха" },
        { id: "paco-piotr", name: "Пацо и Пьотр" },
        { id: "martina-siyana", name: "Мартина и Сияна" },
        { id: "yoan-iliya", name: "Йоан и Илия" },
        { id: "bogdan-georgi", name: "Богдан и Георги" },
      ],
    },
    {
      id: "affen_gruppe",
      title: "Affen - Gruppe (Компания)",
      image: "/group.jpg",
      nominees: [
        { id: "apartament-valyo", name: "Апартамента на Вальо" },
        { id: "ebe", name: "Е. Б. Е." },
        { id: "kosyo-company", name: "Косьо и компания" },
        { id: "dlad", name: "ДЛАД" },
        { id: "vmp", name: "ВМП" },
      ],
    },
    {
      id: "lowendompteur_bulgarischer_lehrer",
      title: "Löwendompteur - Bulgarischer Lehrer (Български учител)",
      image: "/bgteacher.jpg",
      nominees: [
        { id: "kovachev", name: "Господин Ковачев" },
        { id: "avramova", name: "Госпожа Аврамова" },
        { id: "stoeva", name: "Госпожа Стоева" },
        { id: "yotova", name: "Госпожа Йотова" },
        { id: "gyulemetova2", name: "Госпожа Гюлеметова" },
      ],
    },
    {
      id: "schlangendompteur_deutschlehrer",
      title: "Schlangendompteur - Deutschlehrer (Немски Учител)",
      image: "/deteacher.jpg",
      nominees: [
        { id: "fvieß", name: "Frau Vieß" },
        { id: "hkrause", name: "Herr Krause" },
        { id: "fkaradag", name: "Frau Karadag" },
        { id: "ffong", name: "Frau Fong" },
        { id: "hbehrendt", name: "Herr Behrendt" },
      ],
    },
  ];
  