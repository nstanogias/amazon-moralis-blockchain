import type { NextPage } from 'next'
import Main from '../components/Main'
import Sidebar from '../components/Sidebar'

const styles = {
  container: `h-full w-full flex bg-[#fff]`,
}

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <Sidebar />
      <Main />
    </div>
  )
}

export default Home
